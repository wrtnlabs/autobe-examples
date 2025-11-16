import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Platform admin erases a simple member user account without related data.
 *
 * Business goal:
 *
 * - Verify that a platform administrator can hard-delete a freshly registered
 *   member user who has no related domain data (communities, memberships,
 *   posts, etc.).
 * - Confirm that existence of account status definitions does not block deletion.
 * - Validate that deletion is effective by observing that a second erase attempt
 *   fails.
 *
 * High-level flow:
 *
 * 1. Register a platform admin via /auth/platformAdmin/join, which authenticates
 *    the connection as that admin.
 * 2. As the platform admin, create at least one account status via
 *    /communityPlatform/platformAdmin/accountStatuses to satisfy the
 *    prerequisite that status definitions exist. The created status is not
 *    explicitly tied to the member user in this test.
 * 3. Register a new member user via /auth/memberUser/join using the public
 *    endpoint. This call mutates the same connection to carry the member user's
 *    access token.
 * 4. Re-establish platform admin authentication (call /auth/platformAdmin/join
 *    again) so that admin-only endpoints can be invoked.
 * 5. Call DELETE /communityPlatform/platformAdmin/memberUsers/{memberUserId} with
 *    the id from the member user join response.
 * 6. Validate that the erase call completes successfully and then call the erase
 *    endpoint again for the same memberUserId, asserting that the second call
 *    fails, indicating the user was already removed.
 */
export async function test_api_platform_admin_erases_member_user_without_related_data(
  connection: api.IConnection,
) {
  // 1. Register a platform admin; this also authenticates the connection.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(2),
    href: `https://admin.${RandomGenerator.alphabets(6)}.test/join`,
    referrer: `https://landing.${RandomGenerator.alphabets(6)}.test/`,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create at least one account status definition.
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active member",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Register a new member user via public join endpoint.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(10)}@member.test` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(14),
    href: `https://community.${RandomGenerator.alphabets(6)}.test/signup` as string &
      tags.Format<"uri">,
    referrer:
      `https://referrer.${RandomGenerator.alphabets(6)}.test/landing` as string &
        tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Re-establish platform admin authentication because the member join
  //    has overwritten the Authorization header on the shared connection.
  const platformAdminRejoinBody = {
    username: platformAdminJoinBody.username,
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    displayName: platformAdminJoinBody.displayName,
    href: platformAdminJoinBody.href,
    referrer: platformAdminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminReauthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminRejoinBody,
    });
  typia.assert(platformAdminReauthorized);

  // 5. Perform the erase operation as platform admin.
  await api.functional.communityPlatform.platformAdmin.memberUsers.erase(
    connection,
    {
      memberUserId: memberAuthorized.id,
    },
  );

  // 6. Verify deletion effectiveness by asserting that a second erase call
  //    for the same memberUserId fails with an error.
  await TestValidator.error(
    "second erase on same member user should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.erase(
        connection,
        {
          memberUserId: memberAuthorized.id,
        },
      );
    },
  );
}
