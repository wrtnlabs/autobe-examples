import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { prepare_random_discussion_board_member_session } from "../../../prepare/prepare_random_discussion_board_member_session";
import { generate_random_discussion_board_admin_members_sessions_create } from "../../../generate/generate_random_discussion_board_admin_members_sessions_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IDiscussionBoardAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    },
  );
  typia.assert(admin);
  // 2. Create session for member
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const session =
    await generate_random_discussion_board_admin_members_sessions_create(
      adminConnection,
      {
        params: { memberId },
        body: {
          userAgent: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 10,
          }),
          ip: Array.from({ length: 4 })
            .map(() =>
              typia.random<number & tags.Minimum<0> & tags.Maximum<255>>(),
            )
            .join("."),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    );
  typia.assert(session);
  // 3. Retrieve the created session
  const retrievedSession =
    await api.functional.discussionBoard.admin.members.sessions.at(
      adminConnection,
      {
        memberId,
        sessionId: session.id,
      },
    );
  typia.assert(retrievedSession);
  // 4. Verify session data matches expectations
  TestValidator.equals("session ID matches", retrievedSession.id, session.id);
  TestValidator.equals("session IP matches", retrievedSession.ip, session.ip);
  TestValidator.equals(
    "session userAgent matches",
    retrievedSession.userAgent,
    session.userAgent,
  );
  TestValidator.equals(
    "session createdAt matches",
    retrievedSession.createdAt,
    session.createdAt,
  );
  TestValidator.equals(
    "session expiresAt matches",
    retrievedSession.expiresAt,
    session.expiresAt,
  );
}
