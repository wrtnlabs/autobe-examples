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

export async function test_api_member_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // Create a member account with known credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Attempt to login with correct email but incorrect password
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should fail with incorrect password",
    401,
    async () => {
      await api.functional.erpHrm.auth.member.login(loginConnection, {
        body: {
          email: member.email,
          password: "WrongPassword123!",
          href: "https://test.example.com/login",
          referrer: "https://test.example.com/",
        } satisfies IErpHrmMember.ILogin,
      });
    },
  );
}
