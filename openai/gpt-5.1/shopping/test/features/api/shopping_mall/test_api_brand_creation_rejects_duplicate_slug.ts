import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that creating brands with duplicate slugs is rejected.
 *
 * Business context: Brand slugs in the ShoppingMall catalog are used as
 * URL-friendly, stable identifiers for brands in SEO-friendly routes, linking,
 * and integrations. Because of this, the backend enforces a uniqueness
 * constraint on the `slug` column of `shopping_mall_brands`. Platform admins
 * should be able to create new brands freely as long as they choose unique
 * slugs, but any attempt to reuse an existing slug must fail with a
 * business-level error.
 *
 * This e2e test covers the positive path for initial brand creation and then
 * verifies that a second creation with the same slug is rejected, while
 * creation with a new slug still succeeds.
 *
 * Step-by-step scenario:
 *
 * 1. Join as a platform administrator using POST /auth/platformAdmin/join with
 *    IShoppingMallPlatformAdminJoin.IRequest. This automatically establishes an
 *    authenticated session (via SDK-managed Authorization header) for
 *    admin-only operations.
 * 2. Call POST /shoppingMall/platformAdmin/brands once with a valid
 *    IShoppingMallBrand.ICreate payload containing a specific `name` and `slug`
 *    (plus optional `description` and `logo_uri`). Assert that the call
 *    succeeds, the response is a valid IShoppingMallBrand, and that the
 *    returned slug equals the requested slug.
 * 3. Call POST /shoppingMall/platformAdmin/brands a second time with a different
 *    `name` but the exact same `slug` as in step 2, wrapped in `await
 *    TestValidator.error`. This verifies that the duplicate-slug attempt fails
 *    with an error (business-level uniqueness enforcement). We do not check
 *    specific HTTP status codes or error payloads.
 * 4. Call POST /shoppingMall/platformAdmin/brands a third time with a new, unique
 *    slug to confirm that brand creation still works when the slug is unique.
 *    Validate the response with typia.assert and a couple of basic equality
 *    predicates.
 *
 * Implementation notes:
 *
 * - Use typia.random and RandomGenerator utilities to generate emails, URLs, and
 *   free-form strings. All request bodies must use `satisfies` with the correct
 *   DTO type (IShoppingMallPlatformAdminJoin.IRequest and
 *   IShoppingMallBrand.ICreate).
 * - Do not manipulate `connection.headers` directly; rely on the SDK’s token
 *   propagation from the join() call.
 * - Focus on business logic (slug uniqueness), and do not write tests that
 *   intentionally send wrong-typed data or omit required fields.
 */
export async function test_api_brand_creation_rejects_duplicate_slug(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create an initial brand with a unique slug
  const baseSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const firstBrandBody = {
    name: RandomGenerator.name(),
    slug: baseSlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const firstBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: firstBrandBody,
    });
  typia.assert<IShoppingMallBrand>(firstBrand);

  TestValidator.equals(
    "created brand slug should match requested slug",
    firstBrand.slug,
    baseSlug,
  );

  // 3. Attempt to create a second brand with the same slug and expect failure
  const duplicateSlugBrandBody = {
    name: RandomGenerator.name(),
    slug: baseSlug, // same slug as firstBrand
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  await TestValidator.error(
    "creating a brand with a duplicate slug must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.brands.create(
        connection,
        {
          body: duplicateSlugBrandBody,
        },
      );
    },
  );

  // 4. Create a third brand with a different, unique slug to confirm success
  const uniqueSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const thirdBrandBody = {
    name: RandomGenerator.name(),
    slug: uniqueSlug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const thirdBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: thirdBrandBody,
    });
  typia.assert<IShoppingMallBrand>(thirdBrand);

  TestValidator.equals(
    "third brand slug should match its requested unique slug",
    thirdBrand.slug,
    uniqueSlug,
  );

  TestValidator.notEquals(
    "first and third brand IDs should differ",
    firstBrand.id,
    thirdBrand.id,
  );
}
