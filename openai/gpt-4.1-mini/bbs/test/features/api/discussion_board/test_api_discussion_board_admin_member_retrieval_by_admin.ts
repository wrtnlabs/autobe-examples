import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";

export async function test_api_discussion_board_admin_member_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (authenticates) to gain admin privileges
  const adminJoinBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: "Password123!",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Admin creates a discussion board member for retrieval
  const memberCreateBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: "Password123!",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardDiscussionBoardMember.ICreate;
  const member: IDiscussionBoardDiscussionBoardMember =
    await api.functional.discussionBoard.discussionBoardMembers.create(
      connection,
      { body: memberCreateBody },
    );
  typia.assert(member);

  // 3. Admin retrieves the discussion board member by ID
  const retrieved: IDiscussionBoardDiscussionBoardMember =
    await api.functional.discussionBoard.admin.discussionBoardMembers.at(
      connection,
      { discussionBoardMemberId: member.id },
    );
  typia.assert(retrieved);

  // 4. Validate that the retrieved member data matches the created member
  TestValidator.equals("retrieved member id matches", retrieved.id, member.id);
  TestValidator.equals(
    "retrieved member email matches",
    retrieved.email,
    member.email,
  );
  TestValidator.equals(
    "retrieved member nickname matches",
    retrieved.nickname,
    member.nickname,
  );
  TestValidator.equals(
    "retrieved member status matches",
    retrieved.status,
    member.status,
  );
  TestValidator.equals(
    "retrieved member role matches",
    retrieved.role,
    member.role,
  );
}
