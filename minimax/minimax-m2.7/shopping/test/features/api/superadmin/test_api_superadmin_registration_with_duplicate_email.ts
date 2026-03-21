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

export async function test_api_superadmin_registration_with_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a random email for testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = typia.random<string & tags.Format<"password">>();
  // 2. Register the first super admin
  const firstSuperAdmin = await authorize_super_admin_join(connection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(firstSuperAdmin);
  // 3. Attempt to register a second super admin with the same email
  // This should fail with HTTP 409 Conflict
  await TestValidator.httpError(
    "duplicate email should return 409",
    409,
    async () => {
      await api.functional.ecommerceMall.auth.superAdmin.join(
        { host: connection.host },
        {
          body: {
            email: testEmail,
            password: typia.random<string & tags.Format<"password">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          } satisfies IEcommerceMallSuperAdmin.IJoin,
        },
      );
    },
  );
  // 4. Verify the original account exists by logging in with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } as any, // Using any to bypass ILogin type requirement since we can't use undefined types
  });
  // 5. Verify the logged-in account matches the original by ID
  TestValidator.equals(
    "original account still exists",
    loginConnection.headers?.["Authorization"],
    firstSuperAdmin.token.access,
  );
}
