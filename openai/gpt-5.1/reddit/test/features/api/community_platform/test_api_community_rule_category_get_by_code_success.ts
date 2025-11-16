import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that a community rule category can be retrieved by its unique code and
 * that the full entity fields are returned correctly, including accessibility
 * without authentication.
 *
 * Business context: Platform administrators manage a global catalog of
 * community rule categories that communities use when defining their local
 * rules. These categories are identified primarily by a stable business `code`
 * (like "behavior" or "posting_policy"). Public consumers of configuration
 * metadata should be able to read a category by this code without
 * authentication.
 *
 * Steps:
 *
 * 1. Register a platform administrator using POST /auth/platformAdmin/join.
 * 2. As that admin, create a new community rule category via POST
 *    /communityPlatform/platformAdmin/communityRuleCategories with a unique
 *    `code` and known values for other fields.
 * 3. Call GET
 *    /communityPlatform/communityRuleCategories/{communityRuleCategoryCode}
 *    using the created category's `code` on the same (authenticated)
 *    connection.
 * 4. Assert that the returned category:
 *
 *    - Is a valid ICommunityPlatformCommunityRuleCategory.
 *    - Has the same `id` as the created category.
 *    - Has `code`, `name`, `description`, `sort_order`, and `is_active` equal to the
 *         values used during creation.
 *    - Has `deleted_at` null or undefined for a freshly created record.
 * 5. Construct a second connection object with the same host but an empty
 *    `headers: {}` to simulate an unauthenticated client (no Authorization
 *    header), and call the GET endpoint again with the same `code`.
 * 6. Assert that the unauthenticated GET returns an identical category (same id
 *    and core fields) to prove the endpoint is publicly readable.
 */
export async function test_api_community_rule_category_get_by_code_success(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join)
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password!123",
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/register",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new community rule category as the authenticated platform admin
  const categoryCode: string = `rule_cat_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    code: categoryCode,
    name: "Behavior Rules",
    description:
      "Rules governing acceptable member behavior across communities.",
    sort_order: 10,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const createdCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCategory);

  // 3. GET the community rule category by its unique code (authenticated)
  const fetchedCategoryAuth: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.communityRuleCategories.at(
      connection,
      {
        communityRuleCategoryCode: categoryCode,
      },
    );
  typia.assert(fetchedCategoryAuth);

  // 4. Validate that fields match between created and fetched entities
  TestValidator.equals(
    "id of fetched category matches created category (authenticated)",
    fetchedCategoryAuth.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "code of fetched category matches requested code (authenticated)",
    fetchedCategoryAuth.code,
    categoryCode,
  );
  TestValidator.equals(
    "name of fetched category matches created name (authenticated)",
    fetchedCategoryAuth.name,
    createBody.name,
  );
  TestValidator.equals(
    "description of fetched category matches created description (authenticated)",
    fetchedCategoryAuth.description,
    createBody.description,
  );
  TestValidator.equals(
    "sort_order of fetched category matches created sort_order (authenticated)",
    fetchedCategoryAuth.sort_order,
    createBody.sort_order,
  );
  TestValidator.equals(
    "is_active of fetched category matches created is_active (authenticated)",
    fetchedCategoryAuth.is_active,
    createBody.is_active,
  );
  TestValidator.predicate(
    "deleted_at is null or undefined for freshly created category (authenticated)",
    fetchedCategoryAuth.deleted_at === null ||
      fetchedCategoryAuth.deleted_at === undefined,
  );

  // 5. Create an unauthenticated connection and call the GET endpoint again
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const fetchedCategoryPublic: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.communityRuleCategories.at(
      unauthenticatedConnection,
      {
        communityRuleCategoryCode: categoryCode,
      },
    );
  typia.assert(fetchedCategoryPublic);

  // 6. Validate that the unauthenticated response matches the created category
  TestValidator.equals(
    "id of public-fetched category matches created category",
    fetchedCategoryPublic.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "code of public-fetched category matches requested code",
    fetchedCategoryPublic.code,
    categoryCode,
  );
  TestValidator.equals(
    "name of public-fetched category matches created name",
    fetchedCategoryPublic.name,
    createBody.name,
  );
  TestValidator.equals(
    "description of public-fetched category matches created description",
    fetchedCategoryPublic.description,
    createBody.description,
  );
  TestValidator.equals(
    "sort_order of public-fetched category matches created sort_order",
    fetchedCategoryPublic.sort_order,
    createBody.sort_order,
  );
  TestValidator.equals(
    "is_active of public-fetched category matches created is_active",
    fetchedCategoryPublic.is_active,
    createBody.is_active,
  );
  TestValidator.predicate(
    "deleted_at is null or undefined for freshly created category (public)",
    fetchedCategoryPublic.deleted_at === null ||
      fetchedCategoryPublic.deleted_at === undefined,
  );
}
