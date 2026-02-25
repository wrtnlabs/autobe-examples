import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
 * Test that pending sellers (not yet approved by administrator) cannot create products.
 *
 * This scenario validates the seller approval workflow enforcement:
 * 1. Administrator creates a category for product assignment
 * 2. A new seller registers (approval_status is automatically 'pending')
 * 3. The pending seller attempts to create a product with valid data
 * 4. The system should reject the request with authorization error (HTTP 403)
 *
 * This ensures that only approved sellers can list products on the platform,
 * maintaining administrator oversight of all sellers before they can operate.
 */
export async function test_api_product_creation_pending_seller_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Register a pending seller (not approved by administrator)
  const pendingSellerConnection: api.IConnection = {
    host: connection.host,
  };
  const pendingSeller = await authorize_seller_join(pendingSellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(pendingSeller);
  // Verify seller is in pending status
  TestValidator.equals(
    "pending seller approval status",
    pendingSeller.approvalStatus,
    "pending",
  );
  // 3. Attempt to create product as pending seller - should fail with 403
  const productData: IShoppingMallProduct.ICreate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category_id: category.id,
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;
  await TestValidator.httpError(
    "pending seller cannot create product",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.create(
        pendingSellerConnection,
        { body: productData },
      );
    },
  );
}
