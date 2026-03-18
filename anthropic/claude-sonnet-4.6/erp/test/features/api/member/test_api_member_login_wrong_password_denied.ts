import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_wrong_password_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with a known password
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test Case 1: Correct email, wrong password → expect 401
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with wrong password should return 401",
    401,
    async () => {
      await authorize_member_login(wrongPasswordConnection, {
        body: {
          email,
          password: password + RandomGenerator.alphaNumeric(4),
        } satisfies IErpHrmMember.ILogin,
      });
    },
  );
  // 3. Test Case 2: Completely unregistered email → expect same 401 (anti-enumeration)
  const unregisteredEmailConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.httpError(
    "login with unregistered email should return 401",
    401,
    async () => {
      await authorize_member_login(unregisteredEmailConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IErpHrmMember.ILogin,
      });
    },
  );
}
