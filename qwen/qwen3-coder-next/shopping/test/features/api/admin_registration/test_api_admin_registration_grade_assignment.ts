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

export async function test_api_admin_registration_grade_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Register regular admin (no grade specified - defaults to regular)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await api.functional.ecommerceMall.auth.admin.join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(regularAdmin);
  // Test 2: Verify admin authentication response structure
  TestValidator.equals(
    "admin ID format",
    /^[0-9a-f-]{36}$/i.test(regularAdmin.id),
    true,
  );
  TestValidator.equals(
    "token access type",
    typeof regularAdmin.token.access,
    "string",
  );
  TestValidator.equals(
    "token refresh type",
    typeof regularAdmin.token.refresh,
    "string",
  );
  // Test date format validation
  const isExpiredAtValid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(regularAdmin.token.expired_at);
  TestValidator.equals("expired_at format", isExpiredAtValid, true);
  
  const isRefreshableUntilValid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(regularAdmin.token.refreshable_until);
  TestValidator.equals("refreshable_until format", isRefreshableUntilValid, true);
  // Test 3: Verify connection authorization header was set
  TestValidator.notEquals(
    "authorization header set",
    regularAdminConnection.headers?.Authorization,
    undefined,
  );
  TestValidator.equals(
    "authorization header matches token",
    regularAdminConnection.headers?.Authorization,
    `Bearer ${regularAdmin.token.access}`,
  );
  // Test 4: Register another admin to verify uniqueness
  const anotherAdminConnection: api.IConnection = { host: connection.host };
  const anotherAdmin = await api.functional.ecommerceMall.auth.admin.join(
    anotherAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(anotherAdmin);
  TestValidator.notEquals(
    "different admin IDs",
    regularAdmin.id,
    anotherAdmin.id,
  );
}