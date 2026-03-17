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

/**
 * Test successful administrator login with valid credentials.
 * 1. Create an administrator account with generated email and password
 * 2. Login with the same credentials
 * 3. Verify response contains administrator profile with active status and valid tokens
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate credentials for test
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Create administrator account first
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test login with created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const result = await authorize_admin_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Validate response structure
  typia.assert(result);
  // 4. Verify business logic requirements
  TestValidator.equals("status is active", result.status, "active");
  TestValidator.equals("email matches input", result.email, email);
  TestValidator.predicate(
    "grade is valid",
    result.grade === "regular" || result.grade === "super_admin",
  );
  TestValidator.predicate(
    "access token exists",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );
}
