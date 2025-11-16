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

/**
 * Validate that product detail API returns an error for unknown product codes.
 *
 * Business goal:
 *
 * - Ensure GET /shoppingMall/products/{productCode} does not return a valid
 *   product for a non-existent business-visible productCode.
 * - Verify that client applications can distinguish between existing products and
 *   invalid codes by observing that the unknown code path fails while a known
 *   code path succeeds.
 *
 * Test flow:
 *
 * 1. Bootstrap a platform admin session via POST /auth/platformAdmin/join.
 * 2. As the platform admin, create a catalog product via POST
 *    /shoppingMall/platformAdmin/products.
 * 3. Confirm that querying the detail API with the real product.code succeeds.
 * 4. Derive a synthetic, guaranteed-unknown productCode and ensure that GET
 *    /shoppingMall/products/{productCode} throws an error for it.
 *
 * Notes:
 *
 * - We do not inspect HTTP status codes or error payload contents; we only assert
 *   that an error occurs for the unknown code and that a success response
 *   exists for the known code.
 * - We never manipulate connection.headers directly; authentication tokens are
 *   managed internally by the SDK join call.
 */
export async function test_api_product_detail_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create at least one product in the catalog as platform admin.
  const createBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: null,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const created: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallProduct>(created);

  // 3. Known-code success: GET /shoppingMall/products/{productCode} should
  //    return the created product when using its actual business-visible code.
  const fetched: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(connection, {
      productCode: created.code,
    });
  typia.assert<IShoppingMallProduct>(fetched);

  TestValidator.equals(
    "product detail with existing code returns matching product",
    fetched.code,
    created.code,
  );

  // 4. Unknown-code error: construct a synthetic productCode that is
  //    guaranteed not to exist by suffixing the real one, then ensure the
  //    public detail endpoint fails for it.
  const unknownProductCode: string = `${created.code}__nonexistent`;

  const anonymousConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "product detail with unknown code should fail",
    async () => {
      await api.functional.shoppingMall.products.at(anonymousConnection, {
        productCode: unknownProductCode,
      });
    },
  );
}
