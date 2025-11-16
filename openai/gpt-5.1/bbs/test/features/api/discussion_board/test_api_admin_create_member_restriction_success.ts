import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";

/**
 * Verify that an adminUser can successfully create a new restriction for a
 * freshly-joined member user and that the created restriction reflects the
 * requested attributes, including member linkage and system timestamps.
 *
 * Business flow:
 *
 * 1. A member user joins the discussion board (public member join endpoint).
 * 2. An admin user joins (admin join endpoint) and becomes the current
 *    authenticated actor on the shared connection (SDK sets token header).
 * 3. The admin creates a moderation restriction for that member user via POST
 *    /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction with an
 *    open-ended posting restriction.
 * 4. The API returns the persisted restriction, including an embedded memberUser
 *    summary and system-managed timestamps.
 * 5. The test validates that core fields echo the request and that the member
 *    linkage and timestamps are populated as expected.
 */
export async function test_api_admin_create_member_restriction_success(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://discussion.example.com/join/member", // valid URI format
    referrer: "https://discussion.example.com/landing", // valid URI format
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Register an admin user (this will set connection Authorization to admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://discussion.example.com/admin/join", // valid URI
    referrer: "https://discussion.example.com/admin", // valid URI
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Admin creates a restriction for the member user
  const startedAt = new Date().toISOString();

  const createRestrictionBody = {
    restriction_level: "posting_restriction",
    reason_category: "repeated_violations",
    started_at: startedAt,
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.ICreate;

  const restriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId,
        body: createRestrictionBody,
      },
    );
  typia.assert(restriction);

  // 4. Validate that response matches request and has proper system fields
  TestValidator.equals(
    "restriction.level matches request",
    restriction.restriction_level,
    createRestrictionBody.restriction_level,
  );
  TestValidator.equals(
    "restriction.reason_category matches request",
    restriction.reason_category,
    createRestrictionBody.reason_category,
  );
  TestValidator.equals(
    "restriction.started_at matches request",
    restriction.started_at,
    createRestrictionBody.started_at,
  );
  TestValidator.equals(
    "restriction.ended_at is null as requested",
    restriction.ended_at ?? null,
    createRestrictionBody.ended_at ?? null,
  );

  // memberUser linkage
  TestValidator.equals(
    "embedded memberUser id matches created member",
    restriction.memberUser.id,
    memberUserId,
  );

  TestValidator.predicate(
    "memberUser.display_name is non-empty",
    restriction.memberUser.display_name.length > 0,
  );
  TestValidator.predicate(
    "memberUser.account_status is non-empty",
    restriction.memberUser.account_status.length > 0,
  );

  // created_at and updated_at should be valid ISO date-time strings and non-empty
  TestValidator.predicate(
    "restriction.created_at is non-empty",
    restriction.created_at.length > 0,
  );
  TestValidator.predicate(
    "restriction.updated_at is non-empty",
    restriction.updated_at.length > 0,
  );
}
