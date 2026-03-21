import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_admin_product_snapshots_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for snapshot listing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller connection for product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create initial product (creates first snapshot)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Update product first time (creates second snapshot)
  const firstUpdate = await api.functional.ecommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEcommerceMallProduct.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // 5. Update product second time (creates third snapshot)
  const secondUpdate =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          base_price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // 6. As admin, retrieve product snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Validate pagination metadata exists
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    snapshotsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 3",
    snapshotsResponse.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    snapshotsResponse.pagination.pages >= 1,
  );
  // 8. Validate snapshots are in reverse chronological order (most recent first)
  TestValidator.predicate(
    "snapshots returned",
    snapshotsResponse.data.length >= 3,
  );
  // Check timestamps are in descending order (most recent first)
  for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
    const current = new Date(snapshotsResponse.data[i]!.created_at);
    const next = new Date(snapshotsResponse.data[i + 1]!.created_at);
    TestValidator.predicate(
      `snapshot ${i} is before snapshot ${i + 1}`,
      current >= next,
    );
  }
  // 9. Validate each snapshot contains required fields
  for (const snapshot of snapshotsResponse.data) {
    TestValidator.predicate(
      "snapshot has id",
      snapshot.id !== undefined && snapshot.id !== null,
    );
    TestValidator.predicate(
      "snapshot has name",
      snapshot.name !== undefined && snapshot.name !== null,
    );
    TestValidator.predicate(
      "snapshot has description",
      snapshot.description !== undefined && snapshot.description !== null,
    );
    TestValidator.predicate(
      "snapshot has base_price",
      typeof snapshot.base_price === "number",
    );
    TestValidator.predicate(
      "snapshot has category_name",
      snapshot.category_name !== undefined && snapshot.category_name !== null,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined && snapshot.created_at !== null,
    );
    TestValidator.predicate(
      "snapshot has seller summary",
      snapshot.seller !== undefined && snapshot.seller !== null,
    );
    // Validate seller summary structure
    if (snapshot.seller) {
      TestValidator.predicate(
        "seller has id",
        snapshot.seller.id !== undefined && snapshot.seller.id !== null,
      );
      TestValidator.predicate(
        "seller has email",
        snapshot.seller.email !== undefined && snapshot.seller.email !== null,
      );
      TestValidator.predicate(
        "seller has approval_status",
        snapshot.seller.approval_status !== undefined &&
          snapshot.seller.approval_status !== null,
      );
    }
  }
  // 10. Verify chronological progression of edits
  // Find snapshots with different names (should be at least the initial and first update)
  const nameChanges = snapshotsResponse.data.filter(
    (s) => s.name !== secondUpdate.name,
  );
  TestValidator.predicate(
    "has snapshots before first name update",
    nameChanges.length >= 2,
  );
  // Verify initial snapshot has original name
  const initialSnapshot = snapshotsResponse.data.find(
    (s) => s.name === product.name,
  );
  TestValidator.predicate(
    "initial snapshot found",
    initialSnapshot !== undefined,
  );
}
