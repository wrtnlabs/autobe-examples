import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_login_authentication_failure(
  connection: api.IConnection,
): Promise<void> {
  const joinedConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  const joinBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const joined: IShoppingMallSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(joinedConnection, {
      body: joinBody,
    });
  typia.assert(joined);
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  const wrongPasswordBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href,
    referrer,
    ip,
  } satisfies IShoppingMallSuperAdministrator.ILogin;
  let wrongPasswordError: api.HttpError | null = null;
  await TestValidator.error(
    "login rejects existing email with different password",
    async () => {
      try {
        await authorize_super_administrator_login(wrongPasswordConnection, {
          body: wrongPasswordBody,
        });
      } catch (exp) {
        typia.assertGuard<api.HttpError>(exp);
        wrongPasswordError = exp;
        throw exp;
      }
    },
  );
  const safeWrongPasswordError = typia.assert<api.HttpError>(wrongPasswordError);
  const wrongEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  TestValidator.notEquals(
    "wrong email differs from registered email",
    wrongEmail,
    email,
  );
  const wrongEmailConnection: api.IConnection = { host: connection.host };
  const wrongEmailBody = {
    email: wrongEmail,
    password,
    href,
    referrer,
    ip,
  } satisfies IShoppingMallSuperAdministrator.ILogin;
  let wrongEmailError: api.HttpError | null = null;
  await TestValidator.error(
    "login rejects different email with original password",
    async () => {
      try {
        await authorize_super_administrator_login(wrongEmailConnection, {
          body: wrongEmailBody,
        });
      } catch (exp) {
        typia.assertGuard<api.HttpError>(exp);
        wrongEmailError = exp;
        throw exp;
      }
    },
  );
  const safeWrongEmailError = typia.assert<api.HttpError>(wrongEmailError);
  TestValidator.equals(
    "authentication failure status is identical for wrong email and wrong password",
    safeWrongPasswordError.status,
    safeWrongEmailError.status,
  );
  const wrongPasswordMessage = safeWrongPasswordError.toJSON().message;
  const wrongEmailMessage = safeWrongEmailError.toJSON().message;
  if (
    typeof wrongPasswordMessage === "string" &&
    typeof wrongEmailMessage === "string"
  ) {
    TestValidator.equals(
      "authentication failure message does not reveal whether email or password mismatched",
      wrongPasswordMessage,
      wrongEmailMessage,
    );
  }
}
