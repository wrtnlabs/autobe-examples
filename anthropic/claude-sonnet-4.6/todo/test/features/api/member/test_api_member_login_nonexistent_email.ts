import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // Attempt to log in with an email that has never been registered
  // The system should return 401 Unauthorized (anti-enumeration: same error as wrong password)
  await TestValidator.httpError(
    "login with nonexistent email should return 401",
    401,
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: "ghost_user_99999@nonexistent.example.com" as string &
            tags.Format<"email">,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies ITodoAppMember.ILogin,
      });
    },
  );
}
