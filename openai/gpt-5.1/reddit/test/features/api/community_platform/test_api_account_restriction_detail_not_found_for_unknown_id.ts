import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Verify that an authenticated adminUser receives an error when requesting
 * account restriction details for an unknown restriction id.
 *
 * Business intent
 *
 * - Moderation tooling and automated workflows may hold historical references to
 *   restriction IDs. When a stale or non-existent ID is requested, the backend
 *   must respond with a standardized not-found style error rather than
 *   returning partial or unrelated data.
 * - This test asserts that, under a valid adminUser session, a GET request to the
 *   restriction detail endpoint with an unknown id fails, instead of
 *   accidentally leaking some existing restriction episode.
 *
 * High-level test steps
 *
 * 1. Create and authenticate an adminUser by calling POST /auth/adminUser/join.
 *
 *    - Use ICommunityPlatformAdminUserJoin.IRequest as the body type.
 *    - Assert that the response is a valid ICommunityPlatformAdminuser.IAuthorized.
 * 2. Generate a random UUID value for `accountRestrictionId` that is extremely
 *    unlikely to exist in the database.
 * 3. Attempt to retrieve restriction details by calling GET
 *    /communityPlatform/adminUser/accountRestrictions/{accountRestrictionId}
 *    with the random UUID while the connection carries the adminUser auth
 *    context.
 * 4. Use TestValidator.error to assert that the call fails, indicating not-found
 *    style behavior for unknown IDs.
 *
 * Scope limitations and rules
 *
 * - We do not assert the exact HTTP status code (e.g., 404) or error body shape,
 *   as global guidelines prohibit explicit status-code validation and
 *   error-body structure testing.
 * - We do not touch connection.headers directly; authentication tokens are
 *   managed by the SDK.
 * - We avoid creating or relying on any specific restriction records; instead we
 *   focus purely on the error path for a clearly unknown ID.
 */
export async function test_api_account_restriction_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. AdminUser join & authentication
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Generate a random UUID for a presumably unknown restriction id
  const unknownRestrictionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to fetch details for the unknown restriction id and
  //    assert that an error is thrown.
  await TestValidator.error(
    "admin restriction detail: unknown id returns error",
    async () => {
      await api.functional.communityPlatform.adminUser.accountRestrictions.at(
        connection,
        {
          accountRestrictionId: unknownRestrictionId,
        },
      );
    },
  );
}
