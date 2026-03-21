import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_with_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super admin account for testing password validation
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const correctPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  await authorize_super_admin_join(connection, {
    body: {
      email,
      password: correctPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test login with wrong password fails
  // The system should reject with a generic error message
  await TestValidator.error(
    "login with wrong password should fail",
    async () =>
      await api.functional.ecommerceMall.auth.superAdmin.login(
        {
          host: connection.host,
        },
        {
          body: {
            email,
            password:
              "completely_wrong_password_12345" as string & tags.Format<"password">,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          },
        },
      ),
  );
  // 3. Test login with case-variation of password fails
  // Business rules state passwords are NOT case-sensitive during comparison
  // So this should also fail
  await TestValidator.error(
    "login with case-variation password should fail",
    async () =>
      await api.functional.ecommerceMall.auth.superAdmin.login(
        {
          host: connection.host,
        },
        {
          body: {
            email,
            password:
              correctPassword.toUpperCase() as string & tags.Format<"password">,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          },
        },
      ),
  );
  // 4. Validate that login with correct password works
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await api.functional.ecommerceMall.auth.superAdmin.login(
      {
        host: connection.host,
      },
      {
        body: {
          email,
          password: correctPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      },
    );
  typia.assert(authorized);
}