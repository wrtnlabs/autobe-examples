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

export async function test_api_admin_login_email_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test admin login fails gracefully when email is not registered
  const nonexistentEmail = "nonexistent_admin@test.com";
  const anyPassword = "AnyPassword123!";
  // Attempt login with non-existent email - should return 401
  await TestValidator.httpError(
    "login with nonexistent email returns 401",
    401,
    async () => {
      await api.functional.erpHrm.auth.admin.login(connection, {
        body: {
          email: nonexistentEmail satisfies string & tags.Format<"email">,
          password: anyPassword,
          href: "http://localhost:3000/dashboard" satisfies string &
            tags.Format<"uri">,
          referrer: "http://localhost:3000/login" satisfies string &
            tags.Format<"uri">,
        } satisfies IErpHrmAdmin.ILogin,
      });
    },
  );
}
