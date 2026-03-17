import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_login_credential_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = typia.random<
    string & tags.Format<"password">
  >();
  const wrongPassword = `${administratorPassword}!wrong`;
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  TestValidator.notEquals(
    "wrong password must differ from the registered password",
    wrongPassword,
    administratorPassword,
  );
  const joined = await authorize_administrator_join(joinConnection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
      href,
      referrer,
    },
  });
  typia.assert(joined);
  TestValidator.equals(
    "joined administrator email matches registration email",
    joined.email,
    administratorEmail,
  );
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: administratorEmail,
    password: wrongPassword satisfies string as string &
      tags.Format<"password">,
    href,
    referrer,
  } satisfies IShoppingMallAdministrator.ILogin;
  let authorized: IShoppingMallAdministrator.IAuthorized | null = null;
  let thrown: unknown = undefined;
  try {
    authorized = await authorize_administrator_login(loginConnection, {
      body: loginBody,
    });
  } catch (exp) {
    thrown = exp;
  }
  TestValidator.equals(
    "wrong-password login must not return an authorized administrator payload",
    authorized,
    null,
  );
  TestValidator.predicate(
    "wrong-password login must be rejected",
    thrown !== undefined,
  );
  const message =
    thrown instanceof Error
      ? thrown.message
      : typeof thrown === "string"
        ? thrown
        : JSON.stringify(thrown);
  const loweredMessage = message.toLowerCase();
  TestValidator.predicate(
    "failure message does not disclose submitted correct password",
    message.includes(administratorPassword) === false,
  );
  TestValidator.predicate(
    "failure message remains non-enumerating for credential mismatch",
    loweredMessage.includes("password mismatch") === false &&
      loweredMessage.includes("wrong password") === false &&
      loweredMessage.includes("email not found") === false &&
      loweredMessage.includes("unknown email") === false,
  );
}
