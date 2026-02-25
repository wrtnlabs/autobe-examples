import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_login_failure_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Test super administrator login failure with invalid credentials
  // 1. Register a new super administrator for testing login
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null as null,
  } satisfies IDiscussionBoardSuperAdministrator.IJoin;
  const registeredAdmin = await authorize_super_administrator_join(
    adminConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(registeredAdmin);
  // 2. Attempt login with invalid email (not registered)
  const invalidEmailConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login fails with unregistered email", async () => {
    await authorize_super_administrator_login(invalidEmailConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IDiscussionBoardSuperAdministrator.ILogin,
    });
  });
  // 3. Attempt login with invalid password for registered email
  const invalidPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login fails with incorrect password", async () => {
    await authorize_super_administrator_login(invalidPasswordConnection, {
      body: {
        email: joinBody.email as string & tags.Format<"email">,
        password: "WrongPass123!" as string & tags.Format<"password">,
      } satisfies IDiscussionBoardSuperAdministrator.ILogin,
    });
  });
}
