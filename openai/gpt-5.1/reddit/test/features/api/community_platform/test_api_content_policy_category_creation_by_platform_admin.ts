import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate creation of a global content policy category by a platform admin.
 *
 * Business goal: Ensure that when a freshly registered platform administrator
 * creates a new content policy category via the platformAdmin endpoint, the
 * category is persisted with the requested business code, metadata, activation
 * flags, and audit timestamps, and that the response contract is respected.
 *
 * Scenario steps:
 *
 * 1. Register a new platform administrator via /auth/platformAdmin/join to obtain
 *    an authenticated platformAdmin context.
 * 2. As that admin, call POST
 *    /communityPlatform/platformAdmin/contentPolicyCategories using
 *    api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create
 *    with an ICommunityPlatformContentPolicyCategory.ICreate payload for a
 *    category like "hate_speech".
 * 3. Validate that the response is a well-formed
 *    ICommunityPlatformContentPolicyCategory and that key business fields
 *    (code, name, description, isActive, isDefault, timestamps, deletedAt)
 *    match expectations.
 */
export async function test_api_content_policy_category_creation_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join) to get an authenticated context.
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Create a new content policy category as that admin.
  const categoryCode = "hate_speech";
  const categoryBody = {
    code: categoryCode,
    name: "Hate Speech",
    description: RandomGenerator.paragraph({
      sentences: 12,
      wordMin: 4,
      wordMax: 10,
    }),
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const createdCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(createdCategory);

  // 3. Business assertions on returned category.
  TestValidator.equals(
    "category code should echo the requested code",
    createdCategory.code,
    categoryBody.code,
  );

  TestValidator.equals(
    "category name should echo the requested name",
    createdCategory.name,
    categoryBody.name,
  );

  TestValidator.equals(
    "category description should echo the requested description",
    createdCategory.description,
    categoryBody.description,
  );

  TestValidator.equals(
    "category isActive should be true",
    createdCategory.isActive,
    true,
  );

  TestValidator.equals(
    "category isDefault should be true",
    createdCategory.isDefault,
    true,
  );

  // Audit fields: createdAt and updatedAt must be present as ISO date-time strings.
  // typia.assert already validated the format, so just ensure non-empty presence.
  TestValidator.predicate(
    "createdAt should be a non-empty ISO timestamp",
    () => createdCategory.createdAt.length > 0,
  );

  TestValidator.predicate(
    "updatedAt should be a non-empty ISO timestamp",
    () => createdCategory.updatedAt.length > 0,
  );

  // On creation, deletedAt should not indicate a soft-deleted category.
  TestValidator.predicate(
    "deletedAt should be null or undefined on freshly created category",
    () =>
      createdCategory.deletedAt === null ||
      createdCategory.deletedAt === undefined,
  );
}
