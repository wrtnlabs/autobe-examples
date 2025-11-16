import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_content_policy_category_creation_duplicate_code_conflict(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin to obtain authenticated context
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a baseline content policy category with a unique code
  const categoryCode = `harassment_${RandomGenerator.alphaNumeric(6)}`;

  const firstCreateBody = {
    code: categoryCode,
    name: "Harassment and Bullying",
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const firstCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(firstCategory);

  // Validate first creation basic business fields
  TestValidator.equals(
    "first creation: code should match request",
    firstCategory.code,
    firstCreateBody.code,
  );
  TestValidator.equals(
    "first creation: name should match request",
    firstCategory.name,
    firstCreateBody.name,
  );
  TestValidator.equals(
    "first creation: isActive should match request",
    firstCategory.isActive,
    firstCreateBody.isActive,
  );
  TestValidator.equals(
    "first creation: isDefault should match request",
    firstCategory.isDefault,
    firstCreateBody.isDefault,
  );

  // 3. Attempt to create a second category with the same code
  const secondCreateBody = {
    code: categoryCode, // same code to trigger unique constraint
    name: "Harassment Duplicate",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 9,
    }),
    isActive: true,
    isDefault: false,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  await TestValidator.error(
    "duplicate content policy category code should be rejected",
    async () => {
      await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );

  // 4. Sanity check: original category object remains unchanged in-memory
  TestValidator.equals(
    "original category object remains intact after duplicate attempt",
    firstCategory.code,
    categoryCode,
  );
}
