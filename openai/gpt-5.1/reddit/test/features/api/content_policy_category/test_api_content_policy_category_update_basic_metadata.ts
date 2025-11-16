import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can update only the human-readable
 * metadata (name and description) of an existing content policy category while
 * keeping its stable business code and boolean flags unchanged.
 *
 * Business context:
 *
 * - Content policy categories are referenced across the platform by a stable
 *   business code (code), used in URLs and configuration.
 * - Platform admins must be able to refine wording (name, description) without
 *   breaking existing references or unintentionally toggling flags such as
 *   isActive or isDefault.
 *
 * Scenario steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join to
 *    obtain an authenticated admin context.
 * 2. Create a baseline content policy category via POST
 *    /communityPlatform/platformAdmin/contentPolicyCategories using
 *    ICommunityPlatformContentPolicyCategory.ICreate:
 *
 *    - Code: "self_harm"
 *    - Name: "Self Harm"
 *    - Description: initial policy explanation text
 *    - IsActive: true
 *    - IsDefault: true
 * 3. Update the category via PUT
 *    /communityPlatform/platformAdmin/contentPolicyCategories/{code} using
 *    ICommunityPlatformContentPolicyCategory.IUpdate, changing only the
 *    metadata fields:
 *
 *    - Name -> "Self-Harm and Suicide"
 *    - Description -> expanded guidance string and omitting isActive and isDefault
 *         so they should remain unchanged.
 * 4. Assert that the response:
 *
 *    - Still has code === "self_harm" (immutable business key)
 *    - Reflects the updated name and description
 *    - Preserves isActive === true and isDefault === true
 *    - Has updatedAt greater than createdAt
 *    - Has deletedAt === null (not soft-deleted).
 */
export async function test_api_content_policy_category_update_basic_metadata(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (auth context)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create the baseline content policy category
  const initialCode = "self_harm";
  const initialName = "Self Harm";
  const initialDescription = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 12,
  });

  const createBody = {
    code: initialCode,
    name: initialName,
    description: initialDescription,
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const created: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      { body: createBody },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(created);

  TestValidator.equals(
    "created category code should match initial code",
    created.code,
    initialCode,
  );
  TestValidator.equals(
    "created category name should match initial name",
    created.name,
    initialName,
  );
  TestValidator.equals(
    "created category description should match initial description",
    created.description,
    initialDescription,
  );
  TestValidator.equals(
    "created category isActive should be true",
    created.isActive,
    true,
  );
  TestValidator.equals(
    "created category isDefault should be true",
    created.isDefault,
    true,
  );
  TestValidator.predicate(
    "createdAt and updatedAt should be non-empty ISO strings",
    created.createdAt.length > 0 && created.updatedAt.length > 0,
  );

  // 3. Update only metadata fields (name, description)
  const updatedName = "Self-Harm and Suicide";
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 4,
    wordMax: 12,
  });

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    // isActive and isDefault intentionally omitted to test patch-like behavior
  } satisfies ICommunityPlatformContentPolicyCategory.IUpdate;

  const updated: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.update(
      connection,
      {
        contentPolicyCategoryCode: initialCode,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(updated);

  // 4. Business validations on response
  TestValidator.equals(
    "updated category should keep same business code",
    updated.code,
    initialCode,
  );
  TestValidator.equals(
    "updated category name should be changed to new value",
    updated.name,
    updatedName,
  );
  TestValidator.equals(
    "updated category description should be changed to new value",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "isActive should remain true when omitted from update body",
    updated.isActive,
    created.isActive,
  );
  TestValidator.equals(
    "isDefault should remain true when omitted from update body",
    updated.isDefault,
    created.isDefault,
  );

  TestValidator.predicate(
    "updatedAt should be greater than createdAt after update",
    new Date(updated.updatedAt).getTime() >
      new Date(created.createdAt).getTime(),
  );

  TestValidator.equals(
    "deletedAt should remain null after metadata-only update",
    updated.deletedAt ?? null,
    null,
  );
}
