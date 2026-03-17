import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique credentials for the test
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  // Step 1: Create a super admin account using join endpoint
  const joinBody = {
    email,
    password,
    href: "https://example.com/super-admin/join",
    referrer: "https://example.com/",
    ip: "127.0.0.1",
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  const created = await api.functional.ecommerceMall.auth.superAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(created);
  // Step 2: Login with the same credentials using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
  } satisfies IEcommerceMallSuperAdmin.ILogin;
  const authorized = await authorize_super_admin_login(superAdminConnection, {
    body: loginBody,
  });
  typia.assert(authorized);
  // Step 3: Validate business logic and response structure
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals("grade is super_admin", authorized.grade, "super_admin");
  TestValidator.equals("id matches created account", authorized.id, created.id);
  TestValidator.equals("deletedAt is null", authorized.deletedAt, null);
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
}
