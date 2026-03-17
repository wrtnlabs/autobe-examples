import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_credential_pair_rejected(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const registeredPassword = typia.random<string & tags.Format<"password">>();
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: registeredPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const joined = await authorize_member_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals(
    "joined member email matches registration",
    joined.email,
    joinBody.email,
  );
  TestValidator.equals("joined member is active", joined.deleted_at, null);
  const wrongPassword = typia.random<string & tags.Format<"password">>();
  TestValidator.notEquals(
    "wrong password differs from registered password",
    wrongPassword,
    registeredPassword,
  );
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: joinBody.email,
    password: wrongPassword,
  } satisfies ITodoAppMember.ILogin;
  await TestValidator.error(
    "reject mismatched member credential pair",
    async () => {
      await authorize_member_login(loginConnection, {
        body: loginBody,
      });
    },
  );
}
