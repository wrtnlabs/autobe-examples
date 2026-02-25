import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email for testing
  const email = typia.random<string & tags.Format<"email">>();
  // Create first user successfully
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await api.functional.todoApp.auth.user.join(
    firstUserConnection,
    {
      body: {
        email: email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(firstUser);
  // Attempt duplicate registration with same email but different credentials
  await TestValidator.error("duplicate email should be rejected", async () => {
    const secondUserConnection: api.IConnection = { host: connection.host };
    await api.functional.todoApp.auth.user.join(secondUserConnection, {
      body: {
        email: email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.IJoin,
    });
  });
}
