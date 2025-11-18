import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate public retrieval of an existing active category.
 *
 * ## Business goal
 *
 * Ensure that a category which has been created as `active` in the shoppingMall
 * taxonomy can be retrieved by any unauthenticated client through the public
 * GET /shoppingMall/categories/{categoryId} endpoint. The test confirms both
 * accessibility (no auth required) and data consistency (fields returned by the
 * public endpoint match those persisted by the admin creation endpoint).
 *
 * ## Scenario steps
 *
 * 1. Admin registration (join):
 *
 *    - Call POST /auth/admin/join via api.functional.auth.admin.join.
 *    - Use IShoppingMallAdminJoin.ICreate as the request body type.
 *    - Generate realistic but arbitrary values:
 *
 *         - Email: random valid email.
 *         - Password: random string with password format.
 *         - Href/referrer: random valid URIs.
 *         - Ip: omit or set null (optional, business-agnostic for this test).
 *    - Receive IShoppingMallAdmin.IAuthorized, and validate with typia.assert.
 *    - The SDK automatically sets connection.headers.Authorization to the access
 *         token, providing admin context for subsequent calls.
 * 2. Admin creates an active root leaf category:
 *
 *    - Call POST /shoppingMall/admin/categories via
 *         api.functional.shoppingMall.admin.categories.create.
 *    - Request body type: IShoppingMallCategory.ICreate.
 *    - Populate with deterministic values so assertions are clear:
 *
 *         - Parent_id: null (root category).
 *         - Slug: "home-garden" (recognizable and expected unique for this test run).
 *         - Name_en: "Home & Garden".
 *         - Description_en: optional; can be omitted or filled with
 *                   RandomGenerator.paragraph for realism.
 *         - Status: "active" (string literal; allowed by DTO as generic string, but
 *                   semantically meaningful).
 *         - Sort_order: 20 (int32 numeric value).
 *         - Is_leaf: true.
 *    - Capture the response IShoppingMallCategory as createdCategory and validate
 *         structure via typia.assert.
 * 3. Derive a public (unauthenticated) connection:
 *
 *    - Create unauthConnection by shallow-cloning the incoming connection and
 *         overriding headers with an empty object: { ...connection, headers: {}
 *         }.
 *    - This ensures that the following GET call sends no Authorization header,
 *         emulating a completely public client.
 *    - Do not mutate the original connection.headers beyond what the SDK already
 *         did; use the clone only for the public request.
 * 4. Publicly retrieve the category:
 *
 *    - Call GET /shoppingMall/categories/{categoryId} via
 *         api.functional.shoppingMall.categories.at, using unauthConnection.
 *    - Path parameter: categoryId = createdCategory.id.
 *    - Expect an IShoppingMallCategory as the response and validate with
 *         typia.assert.
 * 5. Validate returned data consistency:
 *
 *    - Business requirement: public endpoint exposes full category detail (as
 *         represented by IShoppingMallCategory) for visible categories.
 *    - Use TestValidator.equals with descriptive titles to assert:
 *
 *         - Id matches createdCategory.id.
 *         - Slug matches createdCategory.slug (which should be "home-garden").
 *         - Name_en matches createdCategory.name_en ("Home & Garden").
 *         - Status matches createdCategory.status ("active").
 *         - Sort_order matches createdCategory.sort_order (20).
 *         - Is_leaf matches createdCategory.is_leaf (true).
 *    - For deleted_at:
 *
 *         - Expect either null or undefined (as per DTO definition of deleted_at?: string
 *                   & tags.Format<"date-time"> | null | undefined).
 *         - Use TestValidator.predicate with a title like "public category should not be
 *                   soft-deleted" to ensure that deleted_at is not a non-null
 *                   string, i.e., readCategory.deleted_at === null ||
 *                   readCategory.deleted_at === undefined.
 * 6. Public access semantics:
 *
 *    - This test does not explicitly assert HTTP status codes or error shapes,
 *         because those are validated by the SDK and underlying framework.
 *         Instead, the fact that the unauthenticated GET call returns a valid
 *         IShoppingMallCategory instance is treated as evidence that the
 *         endpoint is publicly accessible for active categories.
 *
 * ## Implementation notes
 *
 * - All API calls must be awaited.
 * - Use `satisfies` for request body types (IShoppingMallAdminJoin.ICreate and
 *   IShoppingMallCategory.ICreate) instead of `as` casts.
 * - Do not touch connection.headers on the original connection beyond the side
 *   effects performed by api.functional.auth.admin.join; for the
 *   unauthenticated request, use a separate shallow-cloned connection with an
 *   empty headers object.
 * - Rely on typia.assert for structural validation of responses and use
 *   TestValidator.* only for business logic checks (field equality and
 *   soft-delete semantics).
 */
export async function test_api_public_category_retrieval_existing_active(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain admin context
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an active root leaf category with deterministic fields
  const categoryCreateBody = {
    parent_id: null,
    slug: "home-garden",
    name_en: "Home & Garden",
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 20,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(createdCategory);

  // 3. Derive a public (unauthenticated) connection
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // 4. Publicly retrieve the category by id
  const publicCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.categories.at(publicConnection, {
      categoryId: createdCategory.id,
    });
  typia.assert(publicCategory);

  // 5. Validate data consistency between admin-created and public-read category
  TestValidator.equals(
    "public category id matches created category id",
    publicCategory.id,
    createdCategory.id,
  );

  TestValidator.equals(
    "public category slug matches created category slug",
    publicCategory.slug,
    createdCategory.slug,
  );

  TestValidator.equals(
    "public category name_en matches created category name_en",
    publicCategory.name_en,
    createdCategory.name_en,
  );

  TestValidator.equals(
    "public category status matches created category status",
    publicCategory.status,
    createdCategory.status,
  );

  TestValidator.equals(
    "public category sort_order matches created category sort_order",
    publicCategory.sort_order,
    createdCategory.sort_order,
  );

  TestValidator.equals(
    "public category is_leaf matches created category is_leaf",
    publicCategory.is_leaf,
    createdCategory.is_leaf,
  );

  // deleted_at should represent a non-deleted category (null or undefined)
  TestValidator.predicate(
    "public category should not be soft-deleted",
    publicCategory.deleted_at === null ||
      publicCategory.deleted_at === undefined,
  );
}
