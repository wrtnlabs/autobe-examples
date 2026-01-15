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
export async function test_api_member_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrative user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a session for a member (using a random member ID)
  const memberSession =
    await generate_random_discussion_board_admin_members_sessions_create(
      adminConnection,
      {
        params: {
          memberId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          userAgent: RandomGenerator.paragraph({ sentences: 2 }),
          ip: typia.random<string & tags.Format<"ipv4">>(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        } satisfies IDiscussionBoardMemberSession.ICreate,
      },
    );
  typia.assert(memberSession);
  // 3. Validate the session properties
  TestValidator.equals(
    "session id should match",
    memberSession.id,
    memberSession.id,
  );
  TestValidator.equals(
    "session ip should match",
    memberSession.ip,
    memberSession.ip,
  );
  TestValidator.equals(
    "session user agent should match",
    memberSession.userAgent,
    memberSession.userAgent,
  );
  TestValidator.equals(
    "session created at should match",
    memberSession.createdAt,
    memberSession.createdAt,
  );
  TestValidator.equals(
    "session expires at should match",
    memberSession.expiresAt,
    memberSession.expiresAt,
  );
}
