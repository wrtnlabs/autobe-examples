import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can toggle activation and
 * default-taxonomy flags of an existing content policy category without
 * altering its immutable identity or descriptive metadata.
 *
 * Business flow:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join.
 * 2. As that admin, create an active, default content policy category with code
 *    "legacy_policy".
 * 3. Update the category via PUT
 *    /communityPlatform/platformAdmin/contentPolicyCategories/{contentPolicyCategoryCode}
 *    using an ICommunityPlatformContentPolicyCategory.IUpdate payload that only
 *    toggles isActive and isDefault to false.
 * 4. Verify that the returned category reflects the flag changes while preserving
 *    code, name, description, createdAt, and a non-deleted state, and that
 *    updatedAt has advanced.
 */
export async function test_api_content_policy_category_update_activation_flags(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain authenticated context
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongP@ssw0rd!",
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create the initial "legacy_policy" content policy category
  const createBody = {
    code: "legacy_policy",
    name: "Legacy Policy",
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const created: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Basic invariants on creation
  TestValidator.equals(
    "created category code should match the requested code",
    created.code,
    "legacy_policy",
  );
  TestValidator.equals(
    "created category should be active",
    created.isActive,
    true,
  );
  TestValidator.equals(
    "created category should be default",
    created.isDefault,
    true,
  );

  // 3. Update the category to retire it and remove from default taxonomy
  const updateBody = {
    isActive: false,
    isDefault: false,
  } satisfies ICommunityPlatformContentPolicyCategory.IUpdate;

  const updated: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.update(
      connection,
      {
        contentPolicyCategoryCode: "legacy_policy",
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate invariants and lifecycle behavior after update
  TestValidator.equals(
    "updated category should retain the same business code",
    updated.code,
    created.code,
  );
  TestValidator.equals(
    "updated category name should be preserved",
    updated.name,
    created.name,
  );
  TestValidator.equals(
    "updated category description should be preserved",
    updated.description,
    created.description,
  );

  TestValidator.equals(
    "updated category should now be inactive",
    updated.isActive,
    false,
  );
  TestValidator.equals(
    "updated category should no longer be default",
    updated.isDefault,
    false,
  );

  TestValidator.equals(
    "createdAt should remain unchanged after update",
    updated.createdAt,
    created.createdAt,
  );

  // Compare updatedAt ordering using Date objects
  const createdUpdatedAt = new Date(created.updatedAt).getTime();
  const updatedUpdatedAt = new Date(updated.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt should be greater than or equal to previous updatedAt",
    updatedUpdatedAt >= createdUpdatedAt,
  );

  // deletedAt must remain null or undefined (no soft delete occurred)
  TestValidator.predicate(
    "deletedAt should remain null or undefined after flag update",
    updated.deletedAt === null || updated.deletedAt === undefined,
  );
}
