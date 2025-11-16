import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_product_creation_with_missing_prerequisites(
  connection: api.IConnection,
) {
  /**
   * Scenario: platform admin attempts to create a product without satisfying
   * catalog prerequisites (non-existent seller/brand), and the system should
   * reject the operation with a business error.
   *
   * Steps:
   *
   * 1. Join as a new platform admin using POST /auth/platformAdmin/join.
   * 2. Using the authenticated connection, build an IShoppingMallProduct.ICreate
   *    payload where:
   *
   *    - Shopping_mall_seller_id is a random UUID (no actual seller exists).
   *    - Shopping_mall_brand_id is another random UUID (no brand exists).
   *    - Code, name, status, is_multi_sku and other optional fields are valid.
   * 3. Call api.functional.shoppingMall.platformAdmin.products.create and assert
   *    that it fails (throws an error) because the referenced seller or brand
   *    does not exist.
   */

  // 1. Join as platform admin (dependency: POST /auth/platformAdmin/join)
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinRequest,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  TestValidator.predicate(
    "platform admin account should be active",
    admin.isActive === true,
  );

  // 2. Build product creation payload with non-existent seller/brand IDs
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentBrandId = typia.random<string & tags.Format<"uuid">>();

  const invalidProductCreate = {
    shopping_mall_seller_id: nonExistentSellerId,
    shopping_mall_brand_id: nonExistentBrandId,
    code: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "draft",
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.shoppingmall.local/images/sample-product.jpg",
    additional_data: JSON.stringify({
      source: "e2e-test",
      reason: "missing prerequisites",
    }),
  } satisfies IShoppingMallProduct.ICreate;

  // 3. Attempt to create the product and expect a business error
  await TestValidator.error(
    "product creation with non-existent seller/brand must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.create(
        connection,
        {
          body: invalidProductCreate,
        },
      );
    },
  );
}
