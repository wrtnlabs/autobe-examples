import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register a member with known credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(registeredMember);
  // 2. Attempt login with correct email but wrong password
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError(
    "invalid password should return 401 Unauthorized",
    401,
    async () => {
      await authorize_member_login(memberConnection, {
        body: {
          email,
          password: wrongPassword,
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
