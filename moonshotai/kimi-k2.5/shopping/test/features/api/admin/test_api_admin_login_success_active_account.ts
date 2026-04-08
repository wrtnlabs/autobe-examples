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

export async function test_api_admin_login_success_active_account(
  connection: api.IConnection,
): Promise<void> {
  // Setup test credentials as specified in the scenario
  const email = "admin@example.com";
  const password = "SecurePass123!";
  // Step 1: Create an active administrator account via admin join
  // Creates an active admin that can be used for login testing
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(joinConnection, {
    body: {
      email,
      password,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
      ip: "192.168.1.1",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Login with the same credentials using a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Step 3: Validate response structure with complete DTO validation
  // Validates: id (UUID), email, grade, status, nickname, tokens, expired_at, etc.
  typia.assert(authorized);
  // Step 4: Business logic validations
  TestValidator.equals(
    "email matches login credentials",
    authorized.email,
    email,
  );
  TestValidator.equals("account status is active", authorized.status, "active");
  TestValidator.predicate(
    "grade is regular or super_admin",
    authorized.grade === "regular" || authorized.grade === "super_admin",
  );
  TestValidator.predicate(
    "access token is present",
    authorized.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    authorized.refresh.length > 0,
  );
}
