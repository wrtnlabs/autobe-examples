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
  // Create admin account with known credentials using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_admin_join(adminConnection, {});
  // Attempt login with correct email but wrong password
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  const wrongPassword = "WrongPassword123";
  // Verify HTTP 401 error with generic message
  await TestValidator.httpError(
    "admin login fails with wrong password",
    401,
    async () => {
      await api.functional.ecommerceMall.auth.admin.login(
        wrongPasswordConnection,
        {
          body: {
            email: registered.email,
            password: wrongPassword,
            href: "https://example.com/login",
            referrer: "https://example.com/",
          } satisfies IEcommerceMallAdmin.ILogin,
        },
      );
    },
  );
}
