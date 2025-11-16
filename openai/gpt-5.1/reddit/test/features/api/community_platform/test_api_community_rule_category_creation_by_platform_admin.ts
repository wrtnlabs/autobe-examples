import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate creation of global community rule categories by a platform admin.
 *
 * Business purpose:
 *
 * - Ensure that only an authenticated platform administrator can create global
 *   community rule categories used as taxonomy for community rules.
 * - Verify that the create endpoint persists all business fields and audit
 *   metadata for new categories.
 *
 * Scenario steps:
 *
 * 1. Register a fresh platform administrator using POST /auth/platformAdmin/join.
 *
 *    - Send a realistic ICommunityPlatformPlatformadmin.IJoin payload.
 *    - Let the SDK attach the issued access token to the connection automatically.
 *    - Assert the returned ICommunityPlatformPlatformadmin.IAuthorized.
 * 2. As the authenticated platform admin, call POST
 *    /communityPlatform/platformAdmin/communityRuleCategories to create the
 *    first community rule category.
 *
 *    - Use a stable, unique `code` string.
 *    - Provide a clear `name`, rich `description`, small `sort_order`, and
 *         `is_active: true`.
 *    - Assert the response type ICommunityPlatformCommunityRuleCategory.
 * 3. Validate the first created category:
 *
 *    - All request fields are echoed correctly in the response (code, name,
 *         description, sort_order, is_active).
 *    - Id is present (UUID, checked by typia.assert).
 *    - Created_at and updated_at are present and deleted_at is null/undefined for a
 *         newly created active category.
 * 4. Create a second category with a different `code` to confirm multiple distinct
 *    codes are accepted.
 *
 *    - Use different code/name/description/sort_order values.
 *    - Assert the response type.
 * 5. Validate the second created category and cross-check uniqueness:
 *
 *    - Same field-level checks as the first.
 *    - The two categories have different ids and codes.
 */
export async function test_api_community_rule_category_creation_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a fresh platform administrator (auth join)
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorizedAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(authorizedAdmin);

  // 2. Create the first community rule category
  const firstCategoryBody = {
    code: `behavior_${RandomGenerator.alphaNumeric(6)}`,
    name: "Behavior and Conduct",
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    sort_order: 10 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const firstCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: firstCategoryBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityRuleCategory>(firstCategory);

  // 3. Validate the first created category business fields
  TestValidator.equals(
    "first category code should match request",
    firstCategory.code,
    firstCategoryBody.code,
  );
  TestValidator.equals(
    "first category name should match request",
    firstCategory.name,
    firstCategoryBody.name,
  );
  TestValidator.equals(
    "first category description should match request",
    firstCategory.description,
    firstCategoryBody.description,
  );
  TestValidator.equals(
    "first category sort_order should match request",
    firstCategory.sort_order,
    firstCategoryBody.sort_order,
  );
  TestValidator.equals(
    "first category is_active should match request",
    firstCategory.is_active,
    firstCategoryBody.is_active,
  );

  TestValidator.predicate(
    "first category deleted_at should be null or undefined on creation",
    firstCategory.deleted_at === null || firstCategory.deleted_at === undefined,
  );

  // 4. Create a second category with a different code
  const secondCategoryBody = {
    code: `safety_${RandomGenerator.alphaNumeric(6)}`,
    name: "Safety and Reporting",
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    sort_order: 20 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const secondCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: secondCategoryBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityRuleCategory>(secondCategory);

  // 5. Validate second category and ensure uniqueness vs first
  TestValidator.equals(
    "second category code should match request",
    secondCategory.code,
    secondCategoryBody.code,
  );
  TestValidator.equals(
    "second category name should match request",
    secondCategory.name,
    secondCategoryBody.name,
  );
  TestValidator.equals(
    "second category description should match request",
    secondCategory.description,
    secondCategoryBody.description,
  );
  TestValidator.equals(
    "second category sort_order should match request",
    secondCategory.sort_order,
    secondCategoryBody.sort_order,
  );
  TestValidator.equals(
    "second category is_active should match request",
    secondCategory.is_active,
    secondCategoryBody.is_active,
  );

  TestValidator.predicate(
    "second category deleted_at should be null or undefined on creation",
    secondCategory.deleted_at === null ||
      secondCategory.deleted_at === undefined,
  );

  TestValidator.notEquals(
    "two categories must have different ids",
    firstCategory.id,
    secondCategory.id,
  );
  TestValidator.notEquals(
    "two categories must have different codes",
    firstCategory.code,
    secondCategory.code,
  );
}
