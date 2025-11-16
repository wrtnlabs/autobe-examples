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
 * Validate that a member user can read their own restriction status after an
 * admin applies a restriction.
 *
 * Business context:
 *
 * - Member users may have moderation restrictions applied by admin users, stored
 *   in discussion_board_memberuser_restrictions.
 * - Admins create or update restrictions via adminUser endpoints.
 * - Member-facing clients need a simple way for a member user to query their
 *   current restriction state to adjust UI and behavior.
 *
 * This e2e test walks through a realistic multi-actor flow:
 *
 * 1. Register a member user (memberUser actor) through /auth/memberUser/join.
 * 2. Register an admin user (adminUser actor) through /auth/adminUser/join.
 * 3. As the adminUser, create a restriction for the member user via POST
 *    /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction using a
 *    concrete IDiscussionBoardMemberuserRestriction.ICreate payload.
 * 4. Verify the admin create response is a valid
 *    IDiscussionBoardMemberuserRestriction and that it is associated with the
 *    correct member user.
 * 5. Switch back to the memberUser session and invoke GET
 *    /discussionBoard/memberUser/memberUsers/{memberUserId}/restriction with
 *    the member's own id.
 * 6. Assert the member-facing restriction read DTO matches what the admin created
 *    (restriction_level, reason_category, started_at, ended_at, and
 *    memberUser.id).
 *
 * The test does not attempt to validate HTTP status codes or type-error
 * scenarios; it focuses strictly on business-level correctness of the
 * restriction model across admin write and member read endpoints.
 */
export async function test_api_member_restriction_lookup_after_admin_block(
  connection: api.IConnection,
) {
  // 1. Register a member user (memberUser actor) via join.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://example.com/member/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Register an admin user (adminUser actor) via join.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // At this point, connection Authorization header is admin's token.

  // 3. As adminUser, create a restriction for the member user.
  const startedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const restrictionCreateBody = {
    restriction_level: "posting_restriction",
    reason_category: "spam_advertising",
    started_at: startedAt,
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.ICreate;

  const createdRestriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId: memberId,
        body: restrictionCreateBody,
      },
    );
  typia.assert(createdRestriction);

  // Validate basic invariants on created restriction.
  TestValidator.equals(
    "created restriction - restriction_level should match request",
    createdRestriction.restriction_level,
    restrictionCreateBody.restriction_level,
  );
  TestValidator.equals(
    "created restriction - reason_category should match request",
    createdRestriction.reason_category,
    restrictionCreateBody.reason_category,
  );
  TestValidator.equals(
    "created restriction - started_at should match request",
    createdRestriction.started_at,
    restrictionCreateBody.started_at,
  );
  TestValidator.equals(
    "created restriction - ended_at should reflect request null",
    createdRestriction.ended_at ?? null,
    restrictionCreateBody.ended_at ?? null,
  );
  TestValidator.equals(
    "created restriction - memberUser.id should equal target member id",
    createdRestriction.memberUser.id,
    memberId,
  );

  // 4. Switch authentication back to the member user using login.
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/member/login",
    referrer: "https://example.com/member/source",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberReLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReLogin);

  TestValidator.equals(
    "re-logged in member should have same id as initially joined member",
    memberReLogin.id,
    memberId,
  );

  // 5. As the member user, fetch their own restriction via GET.
  const fetchedRestriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.memberUser.memberUsers.restriction.at(
      connection,
      {
        memberUserId: memberId,
      },
    );
  typia.assert(fetchedRestriction);

  // 6. Assert that the fetched restriction matches what the admin created.
  TestValidator.equals(
    "fetched restriction - id should match created restriction id",
    fetchedRestriction.id,
    createdRestriction.id,
  );
  TestValidator.equals(
    "fetched restriction - restriction_level should match created",
    fetchedRestriction.restriction_level,
    createdRestriction.restriction_level,
  );
  TestValidator.equals(
    "fetched restriction - reason_category should match created",
    fetchedRestriction.reason_category,
    createdRestriction.reason_category,
  );
  TestValidator.equals(
    "fetched restriction - started_at should match created",
    fetchedRestriction.started_at,
    createdRestriction.started_at,
  );
  TestValidator.equals(
    "fetched restriction - ended_at should match created (null ongoing)",
    fetchedRestriction.ended_at ?? null,
    createdRestriction.ended_at ?? null,
  );
  TestValidator.equals(
    "fetched restriction - memberUser.id should equal authenticated member id",
    fetchedRestriction.memberUser.id,
    memberReLogin.id,
  );

  // Treat ended_at === null as currently active restriction in client logic.
  TestValidator.predicate(
    "client should treat restriction as active when ended_at is null",
    fetchedRestriction.ended_at === null ||
      fetchedRestriction.ended_at === undefined,
  );
}
