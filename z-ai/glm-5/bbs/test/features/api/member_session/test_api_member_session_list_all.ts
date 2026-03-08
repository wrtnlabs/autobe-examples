import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. List sessions without filters (uses default pagination)
  const sessions = await api.functional.discussionBoard.member.sessions.index(
    memberConnection,
    { body: {} satisfies IDiscussionBoardMemberSession.IRequest },
  );
  typia.assert(sessions);
  // 3. Validate at least one session exists (the one just created)
  TestValidator.predicate("has sessions", sessions.data.length > 0);
  TestValidator.predicate(
    "pagination records positive",
    sessions.pagination.records > 0,
  );
  // 4. Validate current session is included
  const currentSession = sessions.data.find(
    (s) => s.member.id === authorized.id,
  );
  TestValidator.predicate(
    "current member session included",
    currentSession !== undefined,
  );
  // 5. Validate sessions are ordered by created_at descending
  TestValidator.predicate(
    "sessions ordered by created_at descending",
    sessions.data.every(
      (session, index) =>
        index === 0 ||
        new Date(session.created_at).getTime() <=
          new Date(sessions.data[index - 1].created_at).getTime(),
    ),
  );
  // 6. Validate pagination defaults (page should default to 1)
  TestValidator.equals("default page", sessions.pagination.current, 1);
}
