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

export async function test_api_super_admin_login_with_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Test super administrator login fails with non-existent email
  // Attempt to login using an email that does not exist in the system
  // The system should reject the login attempt with a generic error message
  // The error must NOT reveal whether the email exists in the system
  // Validate that no session is created and no tokens are returned
  // First, create a super admin account to establish the actor context
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: superAdminCredentials,
    },
  );
  // Now attempt to login with a non-existent email (different from the registered one)
  const nonExistentEmailLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const nonExistentEmailBody = {
    email: typia.random<string & tags.Format<"email">>(), // This email does not exist
    password: superAdminCredentials.password, // Use a valid password format
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSuperAdmin.ILogin;
  // Login should fail with non-existent email
  // The error should be generic (401 Unauthorized) without revealing email existence
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.ecommerceMall.auth.superAdmin.login(
        nonExistentEmailLoginConnection,
        {
          body: nonExistentEmailBody,
        },
      );
    },
  );
  // Also verify that using a valid email but wrong password fails similarly
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  const wrongPasswordBody = {
    email: superAdminCredentials.email, // Valid email
    password: typia.random<string & tags.Format<"password">>(), // Wrong password
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSuperAdmin.ILogin;
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.ecommerceMall.auth.superAdmin.login(
        wrongPasswordConnection,
        {
          body: wrongPasswordBody,
        },
      );
    },
  );
  // Verify successful login still works with correct credentials
  const validLoginConnection: api.IConnection = { host: connection.host };
  const validLoginBody = {
    email: superAdminCredentials.email,
    password: superAdminCredentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSuperAdmin.ILogin;
  const authorized = await api.functional.ecommerceMall.auth.superAdmin.login(
    validLoginConnection,
    {
      body: validLoginBody,
    },
  );
  typia.assert(authorized);
  TestValidator.equals(
    "authorized email matches",
    authorized.email,
    superAdminCredentials.email,
  );
}
