import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { ITodoListMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListMember";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_session_retrieval_by_unknown_user(
  connection: api.IConnection,
): Promise<void> {
  // Create first member account and authenticate
  const firstMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const firstMemberAuth = await authorize_member_login(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(firstMemberAuth);
  
  // Extract email from JWT token (first part of token) from auth response
  const firstMemberEmail = typia.assert<string>(firstMemberAuth.token).split(".")[0];
  
  // Create second member account and authenticate
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const secondMemberAuth = await authorize_member_login(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(secondMemberAuth);
  
  // Extract email from JWT token (first part of token) from auth response
  const secondMemberEmail = typia.assert<string>(secondMemberAuth.token).split(".")[0];
  
  // Generate a valid UUID to use as a session ID (format correct, but not owned by user B)
  const invalidSessionId = typia.random<
    string & tags.Format<"uuid">
  >() as string;
  
  // Attempt to access this session ID with second member's connection
  // Expected result: 404 - because the session doesn't belong to the authenticated user
  await TestValidator.httpError(
    "second member cannot access any session ID not belonging to them",
    404,
    async () => {
      await api.functional.todoList.user.sessions.at(secondMemberConnection, {
        sessionId: invalidSessionId,
      });
    },
  );
}