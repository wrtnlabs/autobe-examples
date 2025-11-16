import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate creation of an initially inactive community rule category by a
 * platform administrator.
 *
 * Business goals:
 *
 * - Ensure a platformAdmin can create a new community rule category in the global
 *   taxonomy using the privileged endpoint.
 * - Verify that categories can be created in an inactive state to support staged
 *   rollouts.
 * - Confirm that configuration flags and audit timestamps are persisted
 *   correctly, especially `is_active`, `sort_order`, and soft-deletion fields.
 *
 * Scenario steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join. This
 *    both creates the admin row and injects an access token into the connection
 *    headers.
 * 2. As that admin, call POST
 *    /communityPlatform/platformAdmin/communityRuleCategories with an
 *    ICommunityPlatformCommunityRuleCategory.ICreate payload representing a
 *    planned (inactive) category.
 * 3. Assert that the returned ICommunityPlatformCommunityRuleCategory entity
 *    matches the requested configuration and is persisted as inactive while
 *    having proper audit timestamps and a null deleted_at.
 */
export async function test_api_community_rule_category_creation_inactive_configuration(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator so that subsequent calls run
  //    under the platformAdmin actor. The join endpoint also sets
  //    Authorization header on the connection automatically.
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(12)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://console.community-platform.test/admin/join",
    referrer: "https://console.community-platform.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new community rule category configured as initially inactive.
  const ruleCategoryCreateBody = {
    code: `staged_behavior_${RandomGenerator.alphaNumeric(8)}`,
    name: "Staged Behavior Rules",
    description:
      "Rules related to future behavior policies that are defined now but not yet active.",
    sort_order: 500,
    is_active: false,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const createdCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: ruleCategoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  // 3. Business assertions on configuration flags and audit fields.
  TestValidator.equals(
    "created category code should match request",
    createdCategory.code,
    ruleCategoryCreateBody.code,
  );
  TestValidator.equals(
    "created category name should match request",
    createdCategory.name,
    ruleCategoryCreateBody.name,
  );
  TestValidator.equals(
    "created category description should match request",
    createdCategory.description,
    ruleCategoryCreateBody.description,
  );
  TestValidator.equals(
    "created category sort_order should match request",
    createdCategory.sort_order,
    ruleCategoryCreateBody.sort_order,
  );
  TestValidator.equals(
    "created category is_active should be false as requested",
    createdCategory.is_active,
    ruleCategoryCreateBody.is_active,
  );

  // Audit timestamps: created_at and updated_at must be non-empty ISO strings.
  TestValidator.predicate(
    "created_at should be a non-empty string",
    () =>
      typeof createdCategory.created_at === "string" &&
      createdCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    () =>
      typeof createdCategory.updated_at === "string" &&
      createdCategory.updated_at.length > 0,
  );

  // deleted_at should represent a non-deleted category (null or undefined).
  TestValidator.predicate(
    "deleted_at should be null or undefined for a newly created category",
    createdCategory.deleted_at === null ||
      createdCategory.deleted_at === undefined,
  );
}
