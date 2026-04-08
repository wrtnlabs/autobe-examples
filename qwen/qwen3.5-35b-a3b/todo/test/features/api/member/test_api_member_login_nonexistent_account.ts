import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_nonexistent_account(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // Generate a random email that does not exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  // Attempt login with non-existent email - should return 401 Unauthorized
  // Using utility function per utility function priority rules
  await TestValidator.httpError(
    "non-existent email login should fail with 401",
    401,
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: nonExistentEmail,
          password: "TestPassword123",
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IMultiUserTodoMember.ILogin,
      });
    },
  );
}
