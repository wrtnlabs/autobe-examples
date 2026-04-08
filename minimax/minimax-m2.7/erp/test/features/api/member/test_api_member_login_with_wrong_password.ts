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

export async function test_api_member_login_with_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account with valid credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = RandomGenerator.alphaNumeric(16);
  const joined: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: email,
        password: correctPassword,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(joined);
  // 2. Attempt login with correct email but WRONG password
  const wrongPassword = "wrong_password_12345";
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Verify login fails with 401 and no tokens returned
  await TestValidator.httpError(
    "login with wrong password should return 401",
    401,
    async () => {
      await api.functional.erpHrm.auth.member.login(loginConnection, {
        body: {
          email: email,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
}
