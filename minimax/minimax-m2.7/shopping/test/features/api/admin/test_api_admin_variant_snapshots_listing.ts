import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotVariant";
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
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test admin retrieves variant snapshots for policy verification.
 *
 * Business workflow:
 * 1. Admin joins/registers to obtain JWT access token
 * 2. Seller joins/registers and logs in
 * 3. Seller creates a product with category selection
 * 4. Seller adds product variant with SKU and options
 * 5. Seller edits the variant to trigger snapshot creation
 * 6. Seller edits the variant again to create another snapshot
 * 7. Admin queries variant snapshots with pagination
 * 8. Verify response includes paginated list of variant snapshots (newest first)
 * 9. Each snapshot contains: id, sku, price_override, stock_quantity, created_at
 * 10. Parent product_snapshot with: id, name, description, base_price, category_name, created_at, seller info
 * 11. Pagination metadata: current page, total records, total pages, limit
 */
export async function test_api_admin_variant_snapshots_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Seller setup - authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller adds product variant
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          price: product.base_price + 100,
          quantity: 50,
          option_values: [
            {
              key: "color",
              value: "Red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
            {
              key: "size",
              value: "Large",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant);
  // 5. First variant edit - creates first snapshot
  const firstUpdate =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          optionValues:
            variant.optionValues?.map(
              (ov) =>
                ({
                  value: ov.key === "color" ? "Blue" : "Medium",
                }) satisfies IEcommerceMallProductVariantOptionValue.IUpdate,
            ) ?? [],
        },
      },
    );
  typia.assert(firstUpdate);
  // 6. Second variant edit - creates second snapshot
  const secondUpdate =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          optionValues:
            variant.optionValues?.map(
              (ov) =>
                ({
                  value: ov.key === "color" ? "Green" : "Small",
                }) satisfies IEcommerceMallProductVariantOptionValue.IUpdate,
            ) ?? [],
        },
      },
    );
  typia.assert(secondUpdate);
  // 7. Admin queries variant snapshots with pagination
  const snapshotsResponse =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IEcommerceMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 8. Validate response structure
  TestValidator.equals(
    "has pagination metadata",
    snapshotsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination current is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    snapshotsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "has records",
    snapshotsResponse.pagination.records >= 2,
  );
  TestValidator.predicate("has pages", snapshotsResponse.pagination.pages >= 1);
  // 9. Validate data array
  TestValidator.predicate(
    "has at least 2 snapshots",
    snapshotsResponse.data.length >= 2,
  );
  // 10. Verify snapshots are ordered newest first
  if (snapshotsResponse.data.length >= 2) {
    const firstSnapshot = snapshotsResponse.data[0];
    const secondSnapshot = snapshotsResponse.data[1];
    TestValidator.predicate(
      "first snapshot is newer or equal",
      new Date(firstSnapshot.created_at) >= new Date(secondSnapshot.created_at),
    );
  }
  // 11. Validate snapshot structure
  for (const snapshot of snapshotsResponse.data) {
    TestValidator.predicate(
      "snapshot has valid id",
      snapshot.id !== null && snapshot.id !== undefined,
    );
    TestValidator.predicate(
      "snapshot has sku",
      snapshot.sku !== null && snapshot.sku !== undefined,
    );
    TestValidator.predicate(
      "snapshot has stock_quantity",
      typeof snapshot.stock_quantity === "number",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== null && snapshot.created_at !== undefined,
    );
    // Validate product_snapshot structure
    TestValidator.predicate(
      "snapshot has product_snapshot",
      snapshot.product_snapshot !== null &&
        snapshot.product_snapshot !== undefined,
    );
    TestValidator.predicate(
      "product_snapshot has id",
      snapshot.product_snapshot.id !== null &&
        snapshot.product_snapshot.id !== undefined,
    );
    TestValidator.predicate(
      "product_snapshot has name",
      snapshot.product_snapshot.name !== null &&
        snapshot.product_snapshot.name !== undefined,
    );
    TestValidator.predicate(
      "product_snapshot has description",
      snapshot.product_snapshot.description !== null &&
        snapshot.product_snapshot.description !== undefined,
    );
    TestValidator.predicate(
      "product_snapshot has base_price",
      typeof snapshot.product_snapshot.base_price === "number",
    );
    TestValidator.predicate(
      "product_snapshot has category_name",
      snapshot.product_snapshot.category_name !== null &&
        snapshot.product_snapshot.category_name !== undefined,
    );
    TestValidator.predicate(
      "product_snapshot has seller",
      snapshot.product_snapshot.seller !== null &&
        snapshot.product_snapshot.seller !== undefined,
    );
    TestValidator.predicate(
      "product_snapshot.seller has id",
      snapshot.product_snapshot.seller.id !== null &&
        snapshot.product_snapshot.seller.id !== undefined,
    );
  }
  // 12. Test pagination with page 2 (should have fewer or no records)
  const secondPageResponse =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 2,
          limit: 10,
          sort: "-created_at",
        } satisfies IEcommerceMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page current is 2",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.predicate(
    "second page has no more than 10 records",
    secondPageResponse.data.length <= 10,
  );
}
