import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member operations
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new member account
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = "password123";
  await authorize_member_join(memberConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Step 2: Attempt login with valid email but invalid password
  // Expected: Server should reject authentication
  await TestValidator.error("should reject invalid password", async () => {
    await api.functional.discussionBoard.auth.member.login(memberConnection, {
      body: {
        email: joinEmail,
        password: "wrong_password",
      } satisfies IDiscussionBoardMember.ILogin,
    });
  });
  // Step 3: Verify original connection was not modified
  // The base connection should remain unauthenticated
  TestValidator.notEquals(
    "base connection not modified",
    connection.headers,
    memberConnection.headers,
  );
}
