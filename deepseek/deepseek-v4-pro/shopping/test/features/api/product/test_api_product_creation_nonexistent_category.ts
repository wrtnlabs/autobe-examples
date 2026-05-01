import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that product creation with a non-existent category ID is rejected with 404 Not Found.
 *
 * Validates the category existence check in the product creation flow. An approved seller provides all valid product fields — name, description, and base price — but references a shopping_mall_category_id that does not correspond to any existing category. The API must reject the request with HTTP 404 Not Found, confirming the category is validated before the product is created.
 *
 * The test establishes the required actor hierarchy: an administrator to approve seller registrations, and a seller account raised from pending to approved status. The seller then attempts creation with a randomly generated UUID for the category. Since no categories have been created in the system, the UUID is guaranteed to be non-existent, isolating the failure to the category reference alone.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Seller registers in pending status via authorize_seller_join.
 * 3. Administrator approves the seller, granting product creation privileges.
 * 4. Approved seller attempts product creation with a non-existent category UUID.
 * 5. The request is rejected with 404 Not Found.
 */
export async function test_api_product_creation_nonexistent_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves seller
  const approved = await api.functional.shoppingMall.admin.sellers.approve(
    adminConnection,
    {
      sellerId: seller.id,
    },
  );
  typia.assert(approved);
  // 4. Seller attempts product creation with non-existent category → 404
  await TestValidator.httpError("non-existent category", 404, async () => {
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  });
}
