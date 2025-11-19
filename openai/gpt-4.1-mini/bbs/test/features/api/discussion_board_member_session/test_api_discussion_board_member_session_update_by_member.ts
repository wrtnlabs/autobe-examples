import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

export async function test_api_discussion_board_member_session_update_by_member(
  connection: api.IConnection,
) {
  // 1. Register (join) a new discussion board member
  const memberBody = {
    email: `member_${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "securePass123",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2. Create a new session for the member
  const sessionBody = {
    ip: `192.168.${RandomGenerator.alphaNumeric(1)}.${RandomGenerator.alphaNumeric(2)}`,
    href: `https://example.com/page/${RandomGenerator.alphaNumeric(5)}`,
    referrer: `https://referrer.com/path/${RandomGenerator.alphaNumeric(5)}`,
    created_at: new Date().toISOString(),
    expired_at: null,
  } satisfies IDiscussionBoardMemberSession.ICreate;

  const session: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.member.discussionBoardMembers.sessions.createSession(
      connection,
      {
        discussionBoardMemberId: member.id,
        body: sessionBody,
      },
    );
  typia.assert(session);

  // 3. Update the existing session
  const updateBody = {
    ip: `203.0.113.${RandomGenerator.alphaNumeric(1)}${RandomGenerator.alphaNumeric(1)}`,
    href: `https://updated.example.com/resource/${RandomGenerator.alphaNumeric(5)}`,
    referrer: `https://updated-referrer.com/data/${RandomGenerator.alphaNumeric(6)}`,
    expired_at: new Date(Date.now() + 3600 * 1000).toISOString(), // expires in 1 hour
  } satisfies IDiscussionBoardMemberSession.IUpdate;

  const updatedSession =
    await api.functional.discussionBoard.member.discussionBoardMembers.sessions.updateSession(
      connection,
      {
        discussionBoardMemberId: member.id,
        sessionId: session.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // 4. Verify updated data integrity
  TestValidator.equals(
    "IP address should be updated",
    updatedSession.ip,
    updateBody.ip,
  );
  TestValidator.equals(
    "Href should be updated",
    updatedSession.href,
    updateBody.href,
  );
  TestValidator.equals(
    "Referrer should be updated",
    updatedSession.referrer,
    updateBody.referrer,
  );
  TestValidator.equals(
    "Expired_at should be updated",
    updatedSession.expired_at,
    updateBody.expired_at,
  );
}
