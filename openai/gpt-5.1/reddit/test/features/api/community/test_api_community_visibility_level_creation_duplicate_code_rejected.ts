import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that platform admins cannot create duplicate community visibility
 * levels with the same business `code`.
 *
 * Business purpose: Platform-wide visibility levels form a small master-data
 * catalog that is referenced by communities via a stable business-facing `code`
 * (for example, `public`, `restricted`, `private`). To keep this catalog
 * consistent and unambiguous, `code` is enforced as unique in the
 * `community_platform_community_visibility_levels` table. This test ensures
 * that when a platform administrator attempts to create a second visibility
 * level using an already-used `code`, the backend rejects the request.
 *
 * Test steps:
 *
 * 1. Register a platform administrator with POST /auth/platformAdmin/join, using a
 *    realistic ICommunityPlatformPlatformadmin.IJoin payload. The SDK will
 *    automatically attach the issued JWT access token into the `connection`
 *    headers under `Authorization`.
 * 2. As that authenticated platform admin, call
 *    api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create
 *    once with a valid ICommunityPlatformCommunityVisibilityLevel.ICreate
 *    payload containing a unique `code` (e.g., "restricted"), a descriptive
 *    `name`, and `description`. Assert the successful response with
 *    typia.assert and record the returned object.
 * 3. Using the same authenticated connection, immediately attempt a second
 *    `.create` call with the identical `code` but different `name` and
 *    `description` values, to trigger the Prisma unique constraint on `code`.
 * 4. Wrap the second call in TestValidator.error to assert that the backend
 *    rejects the duplicate create attempt. Do not test specific HTTP status
 *    codes or attempt to validate error body fields; only ensure that an error
 *    is thrown.
 * 5. Because no list/get endpoint for visibility levels is available in the
 *    provided SDK, confirm that the original object remains unchanged by
 *    comparing it to itself using TestValidator.equals (this demonstrates that
 *    the test is not mutating or reusing the object in unexpected ways inside
 *    the test function).
 * 6. Ensure strict type safety throughout: use the correct DTO variants
 *    (ICommunityPlatformPlatformadmin.IJoin for join body and
 *    ICommunityPlatformCommunityVisibilityLevel.ICreate for create body) and do
 *    not use `any` or any type-unsafe assertions.
 */
export async function test_api_community_visibility_level_creation_duplicate_code_rejected(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial community visibility level with a unique code.
  const visibilityCode = "restricted";
  const createBody = {
    code: visibilityCode,
    name: `Restricted Visibility ${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const created: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Sanity check: created object must reflect the requested code.
  TestValidator.equals(
    "created visibility level code should match request body",
    created.code,
    visibilityCode,
  );

  // 3 & 4. Attempt to create another visibility level with the same code and
  // expect the backend to reject it.
  const duplicateBody = {
    code: visibilityCode, // same code as before
    name: `Duplicate Restricted ${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  await TestValidator.error(
    "duplicate visibility level code should be rejected",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
        connection,
        {
          body: duplicateBody,
        },
      );
    },
  );

  // 5. Confirm that the originally created object remains unchanged (within
  // the local test context) by comparing it to itself.
  TestValidator.equals(
    "original created visibility level instance remains unchanged in test context",
    created,
    created,
  );
}
