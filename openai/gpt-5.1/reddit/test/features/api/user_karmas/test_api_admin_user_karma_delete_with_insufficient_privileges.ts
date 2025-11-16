import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify that a memberUser token cannot call the admin-only user karma delete
 * endpoint, while an adminUser token can successfully invoke it.
 *
 * Business intent:
 *
 * - The endpoint DELETE /communityPlatform/adminUser/userKarmas/{userKarmaId} is
 *   documented as restricted to `adminUser` actors, because deleting aggregated
 *   user karma records is a sensitive administrative operation.
 * - A member user should never be able to invoke this operation successfully,
 *   even when they provide a syntactically valid `userKarmaId`.
 * - Admin users, on the other hand, are allowed (subject to business rules) and
 *   the SDK places this endpoint under the `adminUser` namespace.
 *
 * Due to SDK limitations, we cannot read or assert the existence/persistence of
 * `community_platform_user_karmas` rows directly, so this test focuses purely
 * on authorization behavior (who can call the endpoint without error).
 *
 * Test steps:
 *
 * 1. Register a new member user via POST /auth/memberUser/join.
 *
 *    - Build a realistic ICommunityPlatformMemberuser.IJoin body:
 *
 *         - `username`: random alphabetic string 3-32 chars.
 *         - `email`: random valid email.
 *         - `password`: at least 8 characters.
 *         - `ip`: pass null explicitly.
 *         - `href` and `referrer`: random valid URIs.
 *    - This call also sets connection.headers.Authorization with a member JWT.
 * 2. With the member token active on the shared connection, attempt to delete a
 *    user karma aggregate via:
 *    api.functional.communityPlatform.adminUser.userKarmas.erase(connection, {
 *    userKarmaId }).
 *
 *    - Use typia.random<string & tags.Format<"uuid">>() for `userKarmaId` so it is
 *         syntactically valid but not necessarily existing.
 *    - Wrap this call in `await TestValidator.error(...)` to assert that it fails
 *         for a memberUser actor. We do NOT assert the exact HTTP status code,
 *         only that an error is thrown.
 * 3. Register a new admin user via POST /auth/adminUser/join.
 *
 *    - Build a body that satisfies ICommunityPlatformAdminUserJoin.IRequest:
 *
 *         - `username`: random string.
 *         - `email`: random email.
 *         - `password`: a fixed strong-looking string (TypeScript treats it as string,
 *                   and typia will enforce password format at runtime).
 *    - This call switches connection.headers.Authorization to an admin JWT.
 * 4. With the admin token active, call the same erase endpoint again with another
 *    random UUID for `userKarmaId` (or reuse the same one).
 *
 *    - This time we expect the call NOT to throw, so we simply `await` it without
 *         wrapping in TestValidator.error.
 * 5. Optionally assert that we reached the end of the function after the admin
 *    call using TestValidator.predicate, which implicitly confirms that the
 *    admin call did not throw.
 */
export async function test_api_admin_user_karma_delete_with_insufficient_privileges(
  connection: api.IConnection,
) {
  // 1. Register a member user (memberUser.join) and assert payload
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As memberUser, attempt to call admin-only erase endpoint and expect error
  const forbiddenUserKarmaId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "member user cannot delete user karma via admin endpoint",
    async () => {
      await api.functional.communityPlatform.adminUser.userKarmas.erase(
        connection,
        {
          userKarmaId: forbiddenUserKarmaId,
        },
      );
    },
  );

  // 3. Register an admin user (adminUser.join) and assert payload, which also
  //    switches the shared connection to use an admin JWT.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. With admin token active, call erase again and expect success (no error)
  const adminUserKarmaId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.communityPlatform.adminUser.userKarmas.erase(
    connection,
    {
      userKarmaId: adminUserKarmaId,
    },
  );

  // 5. Final predicate to document that we reached the end of the flow
  TestValidator.predicate(
    "admin user was able to reach end of karma deletion flow without errors",
    true,
  );
}
