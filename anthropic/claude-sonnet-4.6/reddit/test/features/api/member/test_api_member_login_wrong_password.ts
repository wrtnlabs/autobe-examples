import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account so a known email exists in the system
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joined = await authorize_member_join(memberConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joined);
  // Step 2: Attempt to login with the correct email but a deliberately wrong password
  const wrongLoginConnection: api.IConnection = { host: connection.host };
  const wrongPassword = password + "WRONG";
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await authorize_member_login(wrongLoginConnection, {
        body: {
          email,
          password: wrongPassword,
        } satisfies ICommunityMember.ILogin,
      });
    },
  );
}
