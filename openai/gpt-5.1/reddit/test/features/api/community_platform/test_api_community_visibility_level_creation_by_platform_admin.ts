import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can create a community visibility
 * level.
 *
 * Business flow:
 *
 * 1. Register a new platform administrator using the auth join endpoint and obtain
 *    an authenticated session (SDK writes Authorization header).
 * 2. As the authenticated platform admin, create a new community visibility level
 *    with a unique business code, human-readable name, and description.
 * 3. Validate the created visibility level structure and core business fields
 *    (code, name, description, timestamps, soft-delete state).
 * 4. Attempt to create another visibility level with the same code and confirm
 *    that the backend rejects the duplicate, demonstrating the global
 *    uniqueness constraint on `code`.
 */
export async function test_api_community_visibility_level_creation_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // ip is optional; omit to let backend infer or leave null
    href: "https://admin.console.local/register",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a new community visibility level with unique code
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const created: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(created);

  // 3. Validate that response echoes core fields
  TestValidator.equals(
    "visibility level code should match request",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "visibility level name should match request",
    created.name,
    createBody.name,
  );

  if (createBody.description !== undefined) {
    TestValidator.equals(
      "visibility level description should match when provided",
      created.description ?? undefined,
      createBody.description,
    );
  }

  // 4. Validate timestamps and soft-delete state
  TestValidator.predicate(
    "created_at must be a non-empty string",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    created.updated_at.length > 0,
  );

  // Ensure created_at is not after updated_at (basic temporal sanity check)
  const createdAtDate = new Date(created.created_at);
  const updatedAtDate = new Date(created.updated_at);
  TestValidator.predicate(
    "created_at should not be after updated_at",
    createdAtDate.getTime() <= updatedAtDate.getTime(),
  );

  // deleted_at should indicate an active record (null or undefined)
  TestValidator.predicate(
    "deleted_at should be null or undefined for active visibility level",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  // 5. Attempt to create a duplicate visibility level with the same code
  const duplicateBody = {
    code: visibilityCode, // same code to trigger uniqueness constraint
    name: "Public Duplicate Name",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  await TestValidator.error(
    "duplicate visibility level code must be rejected",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
        connection,
        {
          body: duplicateBody,
        },
      );
    },
  );
}
