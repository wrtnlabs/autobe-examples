import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_member_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminBody: IDiscussionBoardAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin-password123",
  };
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);

  // 2. Generate or use an existing discussion board member ID for fetching
  // For this test, generate a random valid UUID string simulating member ID
  const discussionBoardMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Fetch discussion board member details as admin
  const member: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.discussionBoardMembers.at(
      connection,
      { discussionBoardMemberId },
    );

  typia.assert(member);

  // 4. Validation
  TestValidator.predicate(
    "member ID should be UUID and match input",
    member.id === discussionBoardMemberId,
  );
  TestValidator.predicate(
    "member email should be string",
    typeof member.email === "string",
  );
  TestValidator.predicate(
    "member deleted_at is null, undefined, or string",
    member.deleted_at === null ||
      member.deleted_at === undefined ||
      typeof member.deleted_at === "string",
  );
  // Password should not be empty
  TestValidator.predicate(
    "password is non-empty string",
    typeof member.password === "string" && member.password.length > 0,
  );
}
