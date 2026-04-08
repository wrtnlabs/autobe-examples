import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test seller viewing their own product modification history (snapshots).
 *
 * Validates that a seller can view the complete modification history of their products.
 * Each product modification creates an immutable snapshot preserving the product state
 * at that point in time. This test verifies that:
 * - Initial product creation automatically generates a snapshot
 * - Product updates create additional snapshots
 * - Snapshots are returned in chronological order (newest first)
 * - Each snapshot contains all required fields (id, name, description, base_price,
 *   category_name, created_at, product_id, seller info)
 * - Pagination metadata is included with total records
 *
 * 1. Administrator creates a category for product assignment.
 * 2. Seller registers with email and password credentials.
 * 3. Seller authenticates with valid credentials.
 * 4. Seller creates a product (system auto-creates initial snapshot).
 * 5. Seller updates product name and base price (creates additional snapshot).
 * 6. Seller retrieves product snapshots via the target endpoint.
 * 7. Validates snapshots are returned in chronological order (newest first).
 * 8. Validates each snapshot contains required fields and correct values.
 * 9. Validates pagination metadata with total records count.
 */
export async function test_api_product_snapshot_seller_viewing_own_modification_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Seller joins (register)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates product (auto-creates initial snapshot)
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Store initial values for validation
  const initialName = product.name;
  const initialBasePrice = product.basePrice;
  const initialCategoryName = category.name;
  // 4. Seller updates product (creates additional snapshot)
  const updatedName = `${initialName} - Updated`;
  const updatedBasePrice = initialBasePrice + 5000;
  const updatedProduct =
    await api.functional.ecommerceMall.seller.sellers.me.products.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          basePrice: updatedBasePrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 5. Seller retrieves product snapshots via the target endpoint
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.sellers.me.products.snapshots(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(snapshotsResponse);
  // 6. Validate response structure
  TestValidator.equals(
    "has pagination metadata",
    snapshotsResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination has valid current page",
    snapshotsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    snapshotsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    snapshotsResponse.pagination.records >= 2,
  );
  // 7. Validate snapshots list has at least 2 snapshots (initial + edit)
  TestValidator.predicate(
    "has at least 2 snapshots",
    snapshotsResponse.data.length >= 2,
  );
  // 8. Validate snapshots are in chronological order (newest first)
  const latestSnapshot = snapshotsResponse.data[0];
  const initialSnapshot =
    snapshotsResponse.data[snapshotsResponse.data.length - 1];
  TestValidator.predicate(
    "latest snapshot is newer than initial",
    new Date(latestSnapshot.createdAt) > new Date(initialSnapshot.createdAt),
  );
  // 9. Validate latest snapshot contains updated values
  TestValidator.equals(
    "latest snapshot name matches updated",
    latestSnapshot.name,
    updatedName,
  );
  TestValidator.equals(
    "latest snapshot basePrice matches updated",
    latestSnapshot.basePrice,
    updatedBasePrice,
  );
  TestValidator.equals(
    "latest snapshot categoryName matches",
    latestSnapshot.categoryName,
    initialCategoryName,
  );
  TestValidator.equals(
    "latest snapshot productId matches product",
    latestSnapshot.productId,
    product.id,
  );
  // 10. Validate initial snapshot contains original values
  TestValidator.equals(
    "initial snapshot name matches original",
    initialSnapshot.name,
    initialName,
  );
  TestValidator.equals(
    "initial snapshot basePrice matches original",
    initialSnapshot.basePrice,
    initialBasePrice,
  );
  TestValidator.equals(
    "initial snapshot categoryName matches",
    initialSnapshot.categoryName,
    initialCategoryName,
  );
  TestValidator.equals(
    "initial snapshot productId matches product",
    initialSnapshot.productId,
    product.id,
  );
  // 11. Validate seller info in both snapshots
  TestValidator.predicate(
    "seller info exists in latest snapshot",
    latestSnapshot.seller !== null && latestSnapshot.seller !== undefined,
  );
  TestValidator.predicate(
    "seller info exists in initial snapshot",
    initialSnapshot.seller !== null && initialSnapshot.seller !== undefined,
  );
  // 12. Validate snapshot has description field
  TestValidator.predicate(
    "latest snapshot has description",
    latestSnapshot.description.length > 0,
  );
  TestValidator.predicate(
    "initial snapshot has description",
    initialSnapshot.description.length > 0,
  );
}
