import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Ensure that updating a non-existent community visibility level returns a
 * not-found error.
 *
 * Business goal:
 *
 * - Prove that the visibility level update endpoint correctly returns a not-found
 *   style HTTP error when the target business `visibilityLevelCode` does not
 *   exist, and that this behavior is only observable after proper platform
 *   admin authentication.
 *
 * Scenario steps:
 *
 * 1. Join as a platform administrator using POST /auth/platformAdmin/join with a
 *    realistic registration payload so that the SDK sets an Authorization
 *    header on the underlying connection.
 * 2. Generate a visibility level code string that is extremely unlikely to exist
 *    in the master table (e.g., a long random alphanumeric with a clear
 *    prefix).
 * 3. Build a valid ICommunityPlatformCommunityVisibilityLevel.IUpdate body (e.g.,
 *    name and description) that would succeed structurally if the row existed.
 * 4. Call
 *    api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.update
 *    with the nonexistent code and the valid body, and assert that the call
 *    fails with a 404-style not-found error using TestValidator.httpError. This
 *    verifies that the service distinguishes between "resource does not exist"
 *    and other failure modes.
 * 5. Additionally, derive an unauthenticated connection from the existing one by
 *    clearing headers, and call the same update endpoint without prior join.
 *    Assert that this unauthenticated call fails with an authorization-related
 *    status code (e.g., 401 or 403) using TestValidator.httpError,
 *    demonstrating that the 404 in the main path is not caused by auth
 *    problems.
 *
 * Implementation notes:
 *
 * - Use typia.random to build a realistic ICommunityPlatformPlatformadmin.IJoin
 *   payload and then override fields like email, href, and referrer as needed
 *   with proper formats.
 * - For ICommunityPlatformCommunityVisibilityLevel.IUpdate, only set fields that
 *   exist on the DTO (name, description) and keep them simple strings.
 * - Do not attempt to look up visibility levels afterwards, as no list/get
 *   endpoint is provided in the SDK; rely on HTTP semantics instead.
 */
export async function test_api_community_visibility_level_update_nonexistent_code_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Join as platform administrator to obtain an authenticated session
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin_${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Generate a clearly nonexistent visibility level code
  const visibilityLevelCode: string = `nonexistent-${RandomGenerator.alphaNumeric(24)}`;

  // 3. Prepare a valid update payload for a visibility level
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.IUpdate;

  // 4. Authenticated call should yield a 404-style not-found error
  await TestValidator.httpError(
    "update nonexistent visibility level returns not-found for authenticated admin",
    [404],
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.update(
        connection,
        {
          visibilityLevelCode,
          body: updateBody,
        },
      );
    },
  );

  // 5. Unauthenticated connection should fail with auth-related error (401/403)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "update visibility level without authentication yields auth error (401/403)",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.update(
        unauthenticated,
        {
          visibilityLevelCode,
          body: updateBody,
        },
      );
    },
  );
}
