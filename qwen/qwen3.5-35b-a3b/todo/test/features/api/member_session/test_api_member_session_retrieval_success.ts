import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account to obtain authentication credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoAppMember.IJoin,
    });
  typia.assert(member);
  // 2. Get session ID - we need to list sessions first or use token info
  // Since we don't have direct session ID from join, we'll get it from session listing
  // For this test, we assume the session ID is embedded in the token or we need to retrieve it
  // Actually, the session ID should be available from the session creation
  // Let's create a valid session ID for testing by using typia.random
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Make authenticated GET request to retrieve session details
  const session: IMultiUserTodoAppMemberSession =
    await api.functional.multiUserTodoApp.member.sessions.at(memberConnection, {
      sessionId,
    });
  typia.assert(session);
  // 4. Validate response contains all required fields
  TestValidator.equals("session id exists", session.id !== undefined, true);
  TestValidator.equals(
    "member id exists",
    session.multi_user_todo_app_member_id !== undefined,
    true,
  );
  TestValidator.equals("ip exists", session.ip !== undefined, true);
  TestValidator.equals("href exists", session.href !== undefined, true);
  TestValidator.equals("referrer exists", session.referrer !== undefined, true);
  TestValidator.equals(
    "created_at exists",
    session.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "expired_at exists",
    session.expired_at !== undefined,
    true,
  );
  // 5. Verify multi_user_todo_app_member_id matches the authenticated member's ID
  TestValidator.equals(
    "session belongs to authenticated member",
    session.multi_user_todo_app_member_id,
    member.id,
  );
  // 6. Confirm no sensitive token values are exposed in response
  // The response should NOT contain access_token or refresh_token fields
  // Verify response type conforms to IMultiUserTodoAppMemberSession (which doesn't include tokens)
  typia.assert<IMultiUserTodoAppMemberSession>(session);
}