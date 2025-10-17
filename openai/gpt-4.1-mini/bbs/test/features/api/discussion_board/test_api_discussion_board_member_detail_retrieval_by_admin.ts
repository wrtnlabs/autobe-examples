import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_member_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "validAdminPass123";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Admin user logs in
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdmin.ILogin;
  const adminLogin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // 3. Member user joins
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "validMemberPass123";
  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(member);

  // 4. Admin fetches detailed list of the member
  const fetchedMember: IDiscussionBoardDiscussionBoardMember =
    await api.functional.discussionBoard.admin.discussionBoardMembers.at(
      connection,
      { discussionBoardMemberId: member.id },
    );
  typia.assert(fetchedMember);

  // 5. Validate the fetched member's data correctness
  TestValidator.equals("member ID matches", fetchedMember.id, member.id);
  TestValidator.equals(
    "member email matches",
    fetchedMember.email,
    member.email,
  );
  TestValidator.equals(
    "member display name matches",
    fetchedMember.display_name,
    member.display_name,
  );
  // Password hash must not be empty string (since it's sensitive, just confirm it exists and is string)
  TestValidator.predicate(
    "password_hash exists and is string",
    typeof fetchedMember.password_hash === "string" &&
      fetchedMember.password_hash.length > 0,
  );
  // created_at and updated_at should be valid ISO date strings as per TypeScript type - typia.assert covers this
  typia.assert(fetchedMember.created_at);
  typia.assert(fetchedMember.updated_at);
  // deleted_at can be nullable, ensure it's either null or string
  if (
    fetchedMember.deleted_at !== null &&
    fetchedMember.deleted_at !== undefined
  ) {
    typia.assert(fetchedMember.deleted_at);
  }
}
