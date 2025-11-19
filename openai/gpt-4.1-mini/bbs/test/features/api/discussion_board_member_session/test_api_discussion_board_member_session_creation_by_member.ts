import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

export async function test_api_discussion_board_member_session_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration/join
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedMember);

  // 2. Create new session for the authenticated member
  const createSessionBody = {
    ip: `${RandomGenerator.pick(["192", "10", "172", "127"])}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
        ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
        ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`.replace(
      /\s+/g,
      "",
    ),
    href: `https://${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}.com/${RandomGenerator.name(2).replace(/\s/g, "").toLowerCase()}`,
    referrer: `https://${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}.com/${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}`,
    created_at: new Date().toISOString(),
    expired_at: null,
  } satisfies IDiscussionBoardMemberSession.ICreate;

  const createdSession: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.member.discussionBoardMembers.sessions.createSession(
      connection,
      {
        discussionBoardMemberId: authorizedMember.id,
        body: createSessionBody,
      },
    );
  typia.assert(createdSession);

  TestValidator.equals(
    "session discussion board member id matches",
    createdSession.discussion_board_member_id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "session ip matches",
    createdSession.ip,
    createSessionBody.ip,
  );
  TestValidator.equals(
    "session href matches",
    createdSession.href,
    createSessionBody.href,
  );
  TestValidator.equals(
    "session referrer matches",
    createdSession.referrer,
    createSessionBody.referrer,
  );
  TestValidator.equals(
    "session created_at matches",
    createdSession.created_at,
    createSessionBody.created_at,
  );
  TestValidator.equals(
    "session expired_at matches",
    createdSession.expired_at,
    createSessionBody.expired_at,
  );
}
