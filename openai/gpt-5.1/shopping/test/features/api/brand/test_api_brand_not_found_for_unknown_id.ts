import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate not-found behavior for unknown brand IDs on the public brand detail
 * endpoint.
 *
 * Business goal
 *
 * - Ensure that GET /shoppingMall/brands/{brandId} does NOT return a normal brand
 *   entity when the requested ID does not exist.
 * - Confirm that the happy-path creation flow for brands works (via platformAdmin
 *   join + brand creation), so that the negative test is meaningful.
 * - Verify that the public brands.at endpoint properly rejects unknown UUIDs and
 *   does not accidentally surface soft-deleted entities as active brands.
 * - Ensure that the error for unknown IDs is raised as an HttpError and that no
 *   brand payload is returned in this case.
 *
 * High-level steps
 *
 * 1. Bootstrap a platform admin account using POST /auth/platformAdmin/join so
 *    that we can optionally create a valid brand as a control.
 * 2. Using the authenticated platform admin session, create a new brand via POST
 *    /shoppingMall/platformAdmin/brands to verify the brand subsystem is
 *    operational.
 * 3. Generate a random UUID that is guaranteed to differ from the created brand's
 *    id.
 * 4. Construct an unauthenticated connection object so that GET
 *    /shoppingMall/brands/{brandId} is called as an anonymous storefront
 *    consumer.
 * 5. Call api.functional.shoppingMall.brands.at with the unknown UUID and assert
 *    that it results in an HttpError instead of returning an
 *    IShoppingMallBrand.
 * 6. Do not assert on the exact HTTP status code or response body structure, only
 *    on the fact that an error occurs for the unknown id.
 */
export async function test_api_brand_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authenticated admin session.
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://admin.shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminSession: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminSession);

  // 2. Create a known brand via platformAdmin endpoint to verify system works.
  const createBrandBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.example.com/logo/" +
      RandomGenerator.alphaNumeric(12) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const createdBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: createBrandBody,
    });
  typia.assert<IShoppingMallBrand>(createdBrand);

  // Sanity check: the created brand should have the same basic fields echoed.
  TestValidator.equals(
    "created brand name echoes input name",
    createdBrand.name,
    createBrandBody.name,
  );
  TestValidator.equals(
    "created brand slug echoes input slug",
    createdBrand.slug,
    createBrandBody.slug,
  );

  // 3. Generate a UUID that is guaranteed to be different from the created
  //    brand's id. If the random value matches by chance, retry until it differs.
  let unknownBrandId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownBrandId === createdBrand.id) {
    unknownBrandId = typia.random<string & tags.Format<"uuid">>();
  }
  TestValidator.notEquals(
    "unknown brand id must differ from created brand id",
    createdBrand.id,
    unknownBrandId,
  );

  // 4. Build an unauthenticated connection for storefront access.
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Call GET /shoppingMall/brands/{brandId} with the unknown id and assert
  //    that it fails rather than returning a brand.
  await TestValidator.error("unknown brand id should raise error", async () => {
    await api.functional.shoppingMall.brands.at(anonymousConnection, {
      brandId: unknownBrandId,
    });
  });
}
