import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function test_api_member_session_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Define consistent password
  const password = "Pass1234!";

  // 2. Join new member via auth.member.join to obtain authorized member
  const memberCreateBody = {
    username: RandomGenerator.alphaNumeric(8),
    password: password,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IEconPolDiscussionBoardMember.ICreate;

  const authorizedMember: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(authorizedMember);
  TestValidator.predicate(
    "authorized member has token access",
    authorizedMember.token.access.length > 0,
  );

  // 3. Create member account using econPolDiscussionBoardMembers.create endpoint
  const memberCreateBody2 = {
    username: authorizedMember.username,
    password: password,
    email: authorizedMember.email,
    created_at: authorizedMember.created_at,
    updated_at: authorizedMember.updated_at,
  } satisfies IEconPolDiscussionBoardMember.ICreate;

  const newMember: IEconPolDiscussionBoardMember =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardMembers.create(
      connection,
      { body: memberCreateBody2 },
    );
  typia.assert(newMember);
  TestValidator.equals(
    "created member username matches authorized username",
    newMember.username,
    authorizedMember.username,
  );

  // 4. Generate session id (valid UUID format)
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 5. Delete the session with member username and session id, authenticated as owner
  await api.functional.econPolDiscussionBoard.member.econPolDiscussionBoardMembers.sessions.erase(
    connection,
    {
      memberUsername: authorizedMember.username,
      id: sessionId,
    },
  );

  // No output to assert, assume success if no errors thrown
}
