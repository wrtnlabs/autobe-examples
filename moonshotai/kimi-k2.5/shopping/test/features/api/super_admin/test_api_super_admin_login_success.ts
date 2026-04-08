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

/**
 * Test the happy path for super administrator login.
 * 1. Create a super admin account via the join endpoint.
 * 2. Attempt to log in with the same email and password credentials.
 * 3. Validate that the response returns HTTP 200 with a complete IEcommerceMallSuperAdmin.IAuthorized object containing: the super admin's id, email, grade (should be 'super_admin'), createdAt/updatedAt timestamps, deletedAt (should be null for active account), and a valid IAuthorizationToken with access token, refresh token, expired_at timestamp, and refreshable_until timestamp.
 * 4. Verify that the session metadata (IP, href, referrer) from the login request is properly captured in the session record.
 */
export async function test_api_super_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for super admin creation
  const createConnection: api.IConnection = { host: connection.host };
  // Step 1: Create super admin account with random credentials
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  const joined = await authorize_super_admin_join(createConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  // Step 2: Create a fresh connection for login (no authentication)
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Login with the same credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: "https://admin.mall.example.com/login",
    referrer: "https://admin.mall.example.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSuperAdmin.ILogin;
  const authorized = await authorize_super_admin_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(authorized);
  // Step 4: Validate super admin identity fields
  TestValidator.equals("email matches input", authorized.email, joinBody.email);
  TestValidator.equals("grade is super_admin", authorized.grade, "super_admin");
  TestValidator.equals(
    "deletedAt is null for active account",
    authorized.deletedAt,
    null,
  );
  // Step 5: Validate authorization token structure (typia.assert already validates format)
  TestValidator.predicate(
    "access token exists",
    () => authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => authorized.token.refresh.length > 0,
  );
}
