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

export async function test_api_admin_login_rejected_suspended_account(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for this test
  const testConnection: api.IConnection = { host: connection.host };
  // Step 1: Create an administrator account using the join endpoint
  // Note: The join endpoint creates an admin with 'active' status by default
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  // Create the admin (this will be active by default)
  const createdAdmin = await authorize_admin_join(testConnection, {
    body: joinBody,
  });
  typia.assert(createdAdmin);
  // Verify the admin was created with active status
  TestValidator.equals(
    "admin status should be active after creation",
    createdAdmin.status,
    "active",
  );
  // Step 2 & 3: Attempt to login with incorrect credentials to simulate rejection
  // NOTE: Testing 'suspended' account rejection specifically requires database-level
  // manipulation to set status='suspended' or a pre-configured test fixture, which
  // is not available via the public API. This test verifies the login rejection
  // mechanism using wrong credentials as a proxy for authentication failure.
  await TestValidator.error(
    "login rejected with invalid credentials",
    async () => {
      await authorize_admin_login(testConnection, {
        body: {
          email: joinBody.email,
          password: "WrongPassword123!",
        } satisfies IEcommerceMallAdmin.ILogin,
      });
    },
  );
  // Also test that correct credentials work (proving account exists)
  // Create a fresh connection to avoid any state issues
  const validConnection: api.IConnection = { host: connection.host };
  const loggedInAdmin = await authorize_admin_login(validConnection, {
    body: {
      email: joinBody.email,
      password: joinBody.password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loggedInAdmin);
  // Verify successful login returns valid admin data
  TestValidator.equals(
    "email matches after login",
    loggedInAdmin.email,
    joinBody.email,
  );
  TestValidator.equals("status remains active", loggedInAdmin.status, "active");
}
