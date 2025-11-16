import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";

/**
 * Validate member restriction self-access control and cross-user protection.
 *
 * Business purpose:
 *
 * - An admin can apply a moderation restriction to a specific member user.
 * - A member user can view their **own** restriction status via the member
 *   endpoint.
 * - A different member must **not** be able to read another member's restriction,
 *   preserving privacy and authorization boundaries.
 *
 * Workflow:
 *
 * 1. Register Member A via /auth/memberUser/join and keep email/password/ID.
 * 2. Register Member B via /auth/memberUser/join and keep email/password/ID.
 * 3. Register an admin via /auth/adminUser/join (admin becomes current actor).
 * 4. As admin, create a restriction for Member B via
 *    /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction.
 * 5. Switch to Member B via /auth/memberUser/login.
 * 6. As Member B, fetch their own restriction via the member endpoint and assert
 *    it matches what admin created.
 * 7. Switch to Member A via /auth/memberUser/login.
 * 8. As Member A, attempt to fetch Member B's restriction and assert that the call
 *    fails (authorization error), confirming cross-user access is blocked.
 */
export async function test_api_member_restriction_self_access_control(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = "member-A-password-123";
  const memberAJoinBody = {
    email: memberAEmail,
    password: memberAPassword,
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAAuth: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuth);

  // 2. Register Member B
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = "member-B-password-123";
  const memberBJoinBody = {
    email: memberBEmail,
    password: memberBPassword,
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberBAuth: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuth);

  // 3. Register an admin user (becomes current actor)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuth: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 4. As admin, create a restriction for Member B
  const now = new Date();
  const restrictionCreateBody = {
    restriction_level: "full_block",
    reason_category: "spam_advertising",
    started_at: now.toISOString(),
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.ICreate;

  const createdRestriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId: memberBAuth.id,
        body: restrictionCreateBody,
      },
    );
  typia.assert(createdRestriction);

  TestValidator.equals(
    "admin-created restriction should target Member B",
    createdRestriction.memberUser.id,
    memberBAuth.id,
  );
  TestValidator.equals(
    "restriction_level should match admin input",
    createdRestriction.restriction_level,
    restrictionCreateBody.restriction_level,
  );
  TestValidator.equals(
    "reason_category should match admin input",
    createdRestriction.reason_category,
    restrictionCreateBody.reason_category,
  );

  // 5. Switch to Member B via login
  const memberBLoginBody = {
    email: memberBEmail,
    password: memberBPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberBLoginAuth: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLoginAuth);

  TestValidator.equals(
    "Member B login id should match joined id",
    memberBLoginAuth.id,
    memberBAuth.id,
  );

  // 6. As Member B, fetch own restriction
  const selfRestriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.memberUser.memberUsers.restriction.at(
      connection,
      {
        memberUserId: memberBAuth.id,
      },
    );
  typia.assert(selfRestriction);

  TestValidator.equals(
    "self restriction id should match created restriction id",
    selfRestriction.id,
    createdRestriction.id,
  );
  TestValidator.equals(
    "self restriction memberUser.id should be Member B",
    selfRestriction.memberUser.id,
    memberBAuth.id,
  );
  TestValidator.equals(
    "self restriction level should match",
    selfRestriction.restriction_level,
    restrictionCreateBody.restriction_level,
  );
  TestValidator.equals(
    "self restriction reason category should match",
    selfRestriction.reason_category,
    restrictionCreateBody.reason_category,
  );

  // 7. Switch to Member A via login
  const memberALoginBody = {
    email: memberAEmail,
    password: memberAPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALoginAuth: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoginAuth);

  TestValidator.equals(
    "Member A login id should match joined id",
    memberALoginAuth.id,
    memberAAuth.id,
  );

  // 8. As Member A, attempt to fetch Member B's restriction and expect error
  await TestValidator.error(
    "Member A must not read Member B restriction",
    async () => {
      await api.functional.discussionBoard.memberUser.memberUsers.restriction.at(
        connection,
        {
          memberUserId: memberBAuth.id,
        },
      );
    },
  );
}
