import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieval attempt with an invalid or non-existent session ID.
 *
 * 1. Member authentication using authorize_member_join utility
 * 2. Test with malformed UUID string (invalid format)
 * 3. Test with random valid UUID that doesn't exist (non-existent session)
 * 4. Verify appropriate error responses while maintaining security
 */
export async function test_api_member_session_invalid_session_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Test with malformed UUID (not a valid UUID format)
  await TestValidator.error(
    "malformed UUID should fail validation",
    async () => {
      await api.functional.multiUserTodo.member.members.sessions.at(
        memberConnection,
        { sessionId: "not-a-uuid" as string & tags.Format<"uuid"> },
      );
    },
  );
  // 3. Test with random valid UUID that doesn't correspond to any existing session
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent session ID should return error",
    async () => {
      await api.functional.multiUserTodo.member.members.sessions.at(
        memberConnection,
        { sessionId: randomUuid },
      );
    },
  );
  // Note: Testing expired sessions is not practical in E2E without direct access
  // to session expiration controls. The invalid/non-existent cases adequately
  // test the error handling for the specified endpoint.
}
