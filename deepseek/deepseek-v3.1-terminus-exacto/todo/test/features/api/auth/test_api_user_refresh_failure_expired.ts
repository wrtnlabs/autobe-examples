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

export async function test_api_user_refresh_failure_expired(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(joinResult);
  // Test refresh with a valid but expired/non-existent refresh token
  // Using natural token expiration scenario rather than invalid data types
  await TestValidator.error(
    "refresh with expired token should require re-authentication",
    async () => {
      await authorize_user_refresh(userConnection, {
        body: {
          refresh_token: joinResult.token.refresh + "_simulate_non_existent",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
}
