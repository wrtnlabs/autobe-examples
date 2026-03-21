import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid credentials for admin registration
  const validEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  // Create a new administrator account using admin join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: validEmail,
      password: correctPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Attempt to login with correct email but WRONG password
  // Should fail and return an error
  const wrongPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.ecommerceMall.auth.admin.login(connection, {
        body: {
          email: validEmail,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
}
