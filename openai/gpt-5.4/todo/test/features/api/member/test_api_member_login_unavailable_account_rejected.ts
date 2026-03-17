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

export async function test_api_member_login_unavailable_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  const anonymousConnection: api.IConnection = {
    host: connection.host,
  };
  const loginBody = {
    email:
      `missing-member-${RandomGenerator.alphaNumeric(16)}@example.com` as string &
        tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppMember.ILogin;
  await TestValidator.error(
    "login rejects unavailable member account",
    async () => {
      await authorize_member_login(anonymousConnection, {
        body: loginBody,
      });
    },
  );
  TestValidator.equals(
    "authorization header is not issued after rejected login",
    anonymousConnection.headers?.Authorization,
    undefined,
  );
}
