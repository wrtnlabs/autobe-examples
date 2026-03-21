import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_with_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with known credentials via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin.login.wrongpass@example.com",
      password: "CorrectPass123!",
      display_name: "Wrong Password Admin",
      href: "/dashboard" as string & tags.Format<"uri">,
      referrer: "/login" as string & tags.Format<"uri">,
    },
  });
  // 2. Attempt login with incorrect password
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login should fail with HTTP 401 for incorrect password",
    401,
    async () => {
      await api.functional.erpHrm.auth.admin.login(loginConnection, {
        body: {
          email: "admin.login.wrongpass@example.com",
          password: "WrongPass456!",
          href: "/dashboard" as string & tags.Format<"uri">,
          referrer: "/login" as string & tags.Format<"uri">,
        },
      });
    },
  );
}