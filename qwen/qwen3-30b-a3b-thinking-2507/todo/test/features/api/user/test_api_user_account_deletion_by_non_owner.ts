import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_account_deletion_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create user B
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB = await authorize_user_join(connection, {
    body: {
      email: userBEmail,
      password: "password123",
    },
  });
  // Create user A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA = await authorize_user_join(connection, {
    body: {
      email: userAEmail,
      password: "password123",
    },
  });
  // Login as user A
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userAConnection, {
    body: {
      email: userAEmail,
      password: "password123",
      href: "http://example.com/login",
      referrer: "http://example.com",
    },
  });
  // Try to delete user B's account as user A
  await TestValidator.error(
    "user A should not be able to delete user B's account",
    async () => {
      await api.functional.todo.user.users.erase(userAConnection, {
        userId: userB.id,
      });
    },
  );
}