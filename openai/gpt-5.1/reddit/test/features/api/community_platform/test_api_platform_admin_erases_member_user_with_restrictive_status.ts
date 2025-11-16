import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that a platform administrator can erase a member user whose account is
 * conceptually in a restrictive status, and that the deletion is irreversible
 * from the perspective of subsequent delete attempts.
 *
 * Business context:
 *
 * - Platform admins manage global account status definitions and have authority
 *   to permanently remove problematic member accounts.
 * - Even when an account is heavily restricted (no login, posting, or voting),
 *   admins must still be able to perform terminal lifecycle actions such as
 *   deletion.
 * - After a member has been deleted, subsequent destructive operations on the
 *   same identifier should fail, reflecting that the account is gone.
 *
 * Since the current SDK surface does not expose APIs to actually assign an
 * account status to a member or to read/search member users after deletion,
 * this test uses the following realistic but technically constrained flow:
 *
 * 1. Join as a platform admin to obtain an authenticated admin context.
 * 2. Create a restrictive account status definition as contextual setup
 *    (isLoginAllowed=false, isPostingAllowed=false, isVotingAllowed=false,
 *    requiresManualReview=true) using the platformAdmin/accountStatuses API.
 * 3. Register a new member user via /auth/memberUser/join, capturing the member's
 *    id from the authorized DTO.
 * 4. Re-join as a platform admin so that the Authorization token again represents
 *    a platform admin actor (member join overwrites the token).
 * 5. Call DELETE /communityPlatform/platformAdmin/memberUsers/{memberUserId} for
 *    the created member user and assert that it completes successfully.
 * 6. Attempt to delete the same memberUserId a second time and validate via
 *    TestValidator.error that the operation fails, demonstrating that the
 *    member is considered removed after the first deletion.
 *
 * This test focuses on the administrative capability to delete member users and
 * the irreversibility of that deletion at the API layer, while using the
 * restrictive account status creation as contextual evidence that admins can
 * define such statuses in parallel.
 */
export async function test_api_platform_admin_erases_member_user_with_restrictive_status(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to get an admin-authenticated context.
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a restrictive account status as contextual setup.
  const restrictiveStatusBody = {
    key: `RESTRICTIVE_${RandomGenerator.alphaNumeric(8)}`,
    label: "Restrictive / Sanctioned",
    description:
      "Heavily restricted status disallowing login, posting and voting, requiring manual review.",
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const restrictiveStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: restrictiveStatusBody,
      },
    );
  typia.assert(restrictiveStatus);

  // 3. Register a new member user; this will switch Authorization to member.
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 4. Re-join as platform admin so that subsequent calls use admin token.
  const secondAdminJoinBody = {
    username: `admin2_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const secondAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: secondAdminJoinBody,
    });
  typia.assert(secondAdminAuthorized);

  // 5. First deletion as platform admin should succeed without error.
  await api.functional.communityPlatform.platformAdmin.memberUsers.erase(
    connection,
    {
      memberUserId,
    },
  );

  // 6. Second deletion attempt on the same memberUserId should fail.
  await TestValidator.error(
    "double deletion of member user should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.erase(
        connection,
        {
          memberUserId,
        },
      );
    },
  );
}
