import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate retrieval of content policy categories by code for both active and
 * inactive categories.
 *
 * Business goal:
 *
 * - Ensure that GET
 *   /communityPlatform/contentPolicyCategories/{contentPolicyCategoryCode}
 *   returns a full ICommunityPlatformContentPolicyCategory representation even
 *   when the category is created in an inactive state.
 * - Confirm that the isActive flag in the response reflects the lifecycle state
 *   configured at creation time so that clients can distinguish between active
 *   and inactive categories.
 *
 * Constraints and available APIs:
 *
 * - We can join a platform admin via POST /auth/platformAdmin/join, which returns
 *   ICommunityPlatformPlatformadmin.IAuthorized and also sets the Authorization
 *   header on the connection for subsequent calls.
 * - We can create categories through POST
 *   /communityPlatform/platformAdmin/contentPolicyCategories with body:
 *   ICommunityPlatformContentPolicyCategory.ICreate.
 * - We can fetch a category by its code using GET
 *   /communityPlatform/contentPolicyCategories/{contentPolicyCategoryCode}
 *   which returns ICommunityPlatformContentPolicyCategory.
 * - There is no update or delete endpoint provided in this test context, so we
 *   model an "inactive" category by creating it with isActive=false from the
 *   start. Soft-deleted cases are implicitly represented via the deletedAt
 *   field, but we cannot transition a created row to a deleted state through
 *   the exposed SDK here.
 *
 * Test flow:
 *
 * 1. Register a platform admin with deterministic but random-looking data using
 *    typia.random<ICommunityPlatformPlatformadmin.IJoin>().
 * 2. Using the authenticated connection (Authorization header is set by the join
 *    API), create two content policy categories:
 *
 *    - One active category (isActive=true).
 *    - One inactive category (isActive=false). Codes must be unique, so generate
 *         distinct string codes (e.g., based on RandomGenerator.alphaNumeric).
 * 3. For each created category:
 *
 *    - Call GET /communityPlatform/contentPolicyCategories/{code} using
 *         api.functional.communityPlatform.contentPolicyCategories.at.
 *    - Assert the response shape with
 *         typia.assert<ICommunityPlatformContentPolicyCategory>().
 *    - Validate via TestValidator.equals/TestValidator.predicate that:
 *
 *         - Code, name, description, isDefault, and isActive in the response match the
 *                   values used at creation time.
 *         - DeletedAt is null or undefined for freshly created categories.
 * 4. Specifically confirm that the inactive category (isActive=false) is still
 *    retrievable (no 404) and that isActive in the response is false, verifying
 *    behavior for non-active categories.
 */
export async function test_api_content_policy_category_get_by_code_for_inactive_or_deleted_category(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain platformAdmin authorization.
  const joinInput = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create two content policy categories: one active, one inactive.
  const activeCode = `active_${RandomGenerator.alphaNumeric(12)}`;
  const inactiveCode = `inactive_${RandomGenerator.alphaNumeric(12)}`;

  const activeCreateBody = {
    code: activeCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const inactiveCreateBody = {
    code: inactiveCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    isActive: false,
    isDefault: false,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const activeCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      { body: activeCreateBody },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(activeCategory);

  const inactiveCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      { body: inactiveCreateBody },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(inactiveCategory);

  // Helper to validate a fetched category against its creation payload.
  const validateCategory = (
    titlePrefix: string,
    created: ICommunityPlatformContentPolicyCategory,
    createBody: ICommunityPlatformContentPolicyCategory.ICreate,
    fetched: ICommunityPlatformContentPolicyCategory,
  ): void => {
    TestValidator.equals(
      `${titlePrefix} code should match`,
      fetched.code,
      createBody.code,
    );
    TestValidator.equals(
      `${titlePrefix} name should match`,
      fetched.name,
      createBody.name,
    );
    TestValidator.equals(
      `${titlePrefix} description should match`,
      fetched.description,
      createBody.description,
    );
    TestValidator.equals(
      `${titlePrefix} isDefault should match`,
      fetched.isDefault,
      createBody.isDefault,
    );
    TestValidator.equals(
      `${titlePrefix} isActive should match`,
      fetched.isActive,
      createBody.isActive,
    );

    TestValidator.predicate(
      `${titlePrefix} deletedAt should be null or undefined for fresh category`,
      fetched.deletedAt === null || fetched.deletedAt === undefined,
    );
  };

  // 3. Fetch and validate active category.
  const fetchedActive =
    await api.functional.communityPlatform.contentPolicyCategories.at(
      connection,
      { contentPolicyCategoryCode: activeCategory.code },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(fetchedActive);
  validateCategory(
    "active category",
    activeCategory,
    activeCreateBody,
    fetchedActive,
  );

  // 4. Fetch and validate inactive category (core of this test).
  const fetchedInactive =
    await api.functional.communityPlatform.contentPolicyCategories.at(
      connection,
      { contentPolicyCategoryCode: inactiveCategory.code },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(fetchedInactive);
  validateCategory(
    "inactive category",
    inactiveCategory,
    inactiveCreateBody,
    fetchedInactive,
  );

  // Additional explicit predicate to emphasize the main behavior under test.
  TestValidator.predicate(
    "inactive category should be retrievable with isActive=false",
    fetchedInactive.isActive === false,
  );
}
