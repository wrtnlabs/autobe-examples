import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_product_snapshots_list_own_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product to generate snapshots for
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Edit the product multiple times to create snapshot records
  await api.functional.ecommerceMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: {
      name: `${product.name} - Updated 1`,
      description: `${product.description} - Updated version 1`,
    } satisfies IEcommerceMallProduct.IUpdate,
  });
  typia.assert(
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: `${product.name} - Updated 2`,
          description: `${product.description} - Updated version 2`,
          base_price: product.base_price + 100,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    ),
  );
  // 4. Call GET /seller/product-snapshots to retrieve snapshots
  const snapshotPage =
    await api.functional.ecommerceMall.seller.product_snapshots.list(
      sellerConnection,
    );
  typia.assert(snapshotPage);
  // 5. Validate response structure
  TestValidator.equals(
    "has data array",
    Array.isArray(snapshotPage.data),
    true,
  );
  TestValidator.predicate("has snapshots", snapshotPage.data.length >= 1);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    snapshotPage.pagination !== undefined,
  );
  TestValidator.equals(
    "has current page",
    typeof snapshotPage.pagination.current,
    "number",
  );
  TestValidator.equals(
    "has limit",
    typeof snapshotPage.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "has records count",
    typeof snapshotPage.pagination.records,
    "number",
  );
  TestValidator.equals(
    "has pages count",
    typeof snapshotPage.pagination.pages,
    "number",
  );
  // 7. Validate snapshot structure - each snapshot should have required fields
  for (const snapshot of snapshotPage.data) {
    TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    TestValidator.predicate("snapshot has name", snapshot.name !== undefined);
    TestValidator.predicate(
      "snapshot has description",
      snapshot.description !== undefined,
    );
    TestValidator.predicate(
      "snapshot has basePrice",
      snapshot.basePrice !== undefined,
    );
    TestValidator.predicate(
      "snapshot has categoryName",
      snapshot.categoryName !== undefined,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      snapshot.createdAt !== undefined,
    );
    TestValidator.predicate(
      "snapshot has seller reference",
      snapshot.seller !== undefined,
    );
  }
  // 8. Verify snapshots belong to the authenticated seller only
  for (const snapshot of snapshotPage.data) {
    TestValidator.equals(
      "seller id matches",
      snapshot.seller.id,
      sellerAuth.id,
    );
  }
  // 9. Verify snapshots are ordered by created_at DESC (newest first)
  for (let i = 1; i < snapshotPage.data.length; i++) {
    const prev = new Date(snapshotPage.data[i - 1].createdAt).getTime();
    const curr = new Date(snapshotPage.data[i].createdAt).getTime();
    TestValidator.predicate("snapshots ordered newest first", prev >= curr);
  }
  // 10. Verify snapshots contain different product states (immutability check)
  const uniqueNames = new Set(snapshotPage.data.map((s) => s.name));
  TestValidator.predicate(
    "has multiple snapshot versions",
    uniqueNames.size >= 2,
  );
}
