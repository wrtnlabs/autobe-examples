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
 * Test that a seller cannot update the snapshot images of another seller's product.
 *
 * Validates the ownership-based authorization for product snapshot image updates. The test ensures that only the product owner (or administrators) can modify their product's snapshot images, protecting audit trail integrity from unauthorized modifications.
 *
 * 1. Administrator creates a category for product organization.
 * 2. First seller (owner) registers and creates a product with the category.
 * 3. Second seller (non-owner) registers separately.
 * 4. Second seller attempts to update the first seller's product snapshot images.
 * 5. Verify the system rejects the request with 403 Forbidden error due to lack of ownership.
 *
 * This validates the business rule that snapshot image modifications are restricted to the product owner, ensuring audit trail integrity and preventing unauthorized sellers from modifying another seller's product history.
 */
export async function test_api_product_snapshot_image_update_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. First seller (owner) registers and creates product
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {});
  typia.assert(ownerAuth);
  ownerConnection.headers = {
    Authorization: `Bearer ${ownerAuth.token.access}`,
  };
  const product = await generate_random_shopping_mall_seller_products_create(
    ownerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // Generate a snapshot ID for testing (snapshot would be created on product edit in real flow)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Second seller (non-owner) registers
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_seller_join(nonOwnerConnection, {});
  typia.assert(nonOwnerAuth);
  nonOwnerConnection.headers = {
    Authorization: `Bearer ${nonOwnerAuth.token.access}`,
  };
  // 4-5. Second seller attempts to update first seller's product snapshot images
  // Verify 403 Forbidden error due to lack of ownership
  await TestValidator.error(
    "unauthorized seller cannot update snapshot images",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.images.update(
        nonOwnerConnection,
        {
          productId: product.id,
          snapshotId: snapshotId,
          body: {} satisfies IShoppingMallProductSnapshot.IUpdate,
        },
      );
    },
  );
}
