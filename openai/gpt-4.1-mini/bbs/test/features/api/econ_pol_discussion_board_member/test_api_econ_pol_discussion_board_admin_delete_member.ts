import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function test_api_econ_pol_discussion_board_admin_delete_member(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;
  const admin: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create member
  const memberCreateBody = {
    username: `member_${RandomGenerator.alphaNumeric(6)}`,
    email: `member_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IEconPolDiscussionBoardMember.ICreate;
  const member: IEconPolDiscussionBoardMember =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardMembers.create(
      connection,
      { body: memberCreateBody },
    );
  typia.assert(member);

  // 3. Delete the member by admin
  await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardMembers.erase(
    connection,
    { memberUsername: member.username },
  );

  // 4. Attempt to delete the member again should fail (or recreate member)
  // Since no api to verify member exists, recreate member to confirm deletion
  const recreatedMember: IEconPolDiscussionBoardMember =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardMembers.create(
      connection,
      { body: memberCreateBody },
    );
  typia.assert(recreatedMember);

  TestValidator.equals(
    "member username matches after recreation",
    recreatedMember.username,
    memberCreateBody.username,
  );
}
