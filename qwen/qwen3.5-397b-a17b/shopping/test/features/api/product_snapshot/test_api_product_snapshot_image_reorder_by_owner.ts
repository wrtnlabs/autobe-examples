import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test seller's ability to update their product snapshot image configuration.
 *
 * Validates the workflow where a seller can access the snapshot image update endpoint for their own product. This test ensures that the product owner can interact with their product's snapshot audit records while maintaining proper authorization boundaries.
 *
 * The test covers the full lifecycle: administrative category setup, seller registration and product creation with images, and the snapshot image configuration update operation. Note that product snapshots are immutable audit records by design, and the IUpdate DTO is intentionally empty to preserve audit trail integrity.
 *
 * 1. Administrator creates a category for product organization.
 * 2. Seller registers with credentials and obtains authentication.
 * 3. Seller creates a product which automatically generates initial snapshot with images.
 * 4. Seller calls the snapshot image update endpoint (IUpdate is empty per immutable snapshot design).
 * 5. Validates the response returns snapshot summary with preserved product state.
 * 6. Verifies snapshot maintains historical accuracy with original product name, price, and category.
 */
export async function test_api_product_snapshot_image_reorder_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates product with images (snapshot auto-generated on product creation)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Verify product has images from initial state
  TestValidator.predicate("product has images", product.images.length > 0);
  // 5. Seller calls snapshot image update endpoint
  // Note: IShoppingMallProductSnapshot.IUpdate is empty {} per immutable snapshot design
  // Snapshots preserve historical product state and cannot be modified
  // This endpoint exists for API framework consistency but performs no actual updates
  const updateResult =
    await api.functional.shoppingMall.seller.products.snapshots.images.update(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: product.id, // Using product.id as snapshot reference for this test
        body: {} satisfies IShoppingMallProductSnapshot.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 6. Validate snapshot summary response preserves product state
  TestValidator.equals(
    "snapshot name matches product",
    updateResult.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot base_price matches product",
    updateResult.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "snapshot category matches product category",
    updateResult.category.id,
    category.id,
  );
  TestValidator.predicate(
    "snapshot has valid creation timestamp",
    updateResult.created_at !== null,
  );
}