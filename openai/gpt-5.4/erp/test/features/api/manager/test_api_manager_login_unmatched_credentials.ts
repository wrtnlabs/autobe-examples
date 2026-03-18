import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";

export async function test_api_manager_login_unmatched_credentials(
  connection: api.IConnection,
): Promise<void> {
  const joinedManagerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphaNumeric(12)}Aa1!`;
  const wrongPassword = `${password}${RandomGenerator.alphabets(3)}`;
  const joinBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingManager.IJoin;
  const joined = await authorize_manager_join(joinedManagerConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals("joined manager email matches", joined.email, email);
  TestValidator.predicate(
    "join authorizes joined manager connection",
    joinedManagerConnection.headers?.Authorization !== undefined,
  );
  const invalidLoginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password: wrongPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingManager.ILogin;
  await TestValidator.error(
    "manager login rejects unmatched credentials",
    async () => {
      await authorize_manager_login(invalidLoginConnection, {
        body: loginBody,
      });
    },
  );
  TestValidator.equals(
    "failed login does not authorize connection",
    invalidLoginConnection.headers?.Authorization,
    undefined,
  );
}
