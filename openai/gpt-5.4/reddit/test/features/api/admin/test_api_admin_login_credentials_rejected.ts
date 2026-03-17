import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_credentials_rejected(
  connection: api.IConnection,
): Promise<void> {
  const registrationConnection: api.IConnection = { host: connection.host };
  const password: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(16) satisfies string as string &
      tags.Format<"password">;
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const registered: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(registrationConnection, {
      body: joinBody,
    });
  typia.assert(registered);
  const wrongPassword: string & tags.Format<"password"> =
    `${password}${RandomGenerator.alphabets(4)}` satisfies string as string &
      tags.Format<"password">;
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  const wrongPasswordBody = {
    email: joinBody.email,
    password: wrongPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.ILogin;
  let wrongPasswordMessage: string | undefined = undefined;
  await TestValidator.error("login rejects wrong password", async () => {
    try {
      await authorize_admin_login(wrongPasswordConnection, {
        body: wrongPasswordBody,
      });
    } catch (exp) {
      wrongPasswordMessage =
        typia.is<{
          message: string;
        }>(exp) && typeof exp.message === "string"
          ? exp.message
          : String(exp);
      throw exp;
    }
  });
  TestValidator.equals(
    "wrong password attempt stays unauthenticated",
    wrongPasswordConnection.headers?.Authorization,
    undefined,
  );
  const unknownEmailConnection: api.IConnection = { host: connection.host };
  const unknownEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphaNumeric(12)}@unregistered-admin.test` satisfies string as string &
      tags.Format<"email">;
  const unknownEmailBody = {
    email: unknownEmail,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.ILogin;
  let unknownEmailMessage: string | undefined = undefined;
  await TestValidator.error("login rejects unknown email", async () => {
    try {
      await authorize_admin_login(unknownEmailConnection, {
        body: unknownEmailBody,
      });
    } catch (exp) {
      unknownEmailMessage =
        typia.is<{
          message: string;
        }>(exp) && typeof exp.message === "string"
          ? exp.message
          : String(exp);
      throw exp;
    }
  });
  TestValidator.equals(
    "unknown email attempt stays unauthenticated",
    unknownEmailConnection.headers?.Authorization,
    undefined,
  );
  TestValidator.equals(
    "failure message does not disclose credential factor",
    wrongPasswordMessage,
    unknownEmailMessage,
  );
}
