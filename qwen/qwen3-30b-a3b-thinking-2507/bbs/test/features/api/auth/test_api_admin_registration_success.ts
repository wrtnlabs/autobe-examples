import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection for admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  // Register admin account with random data
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: typia.random<IEconPoliticBoardAdmin.IJoin>() satisfies IEconPoliticBoardAdmin.IJoin,
  });
  // Validate type safety
  typia.assert(adminAccount);
  // Verify ID as valid UUID
  TestValidator.equals(
    "admin ID should be a valid UUID",
    adminAccount.id.length,
    36,
  );
  // Verify email format
  TestValidator.equals(
    "admin email should contain '@'",
    adminAccount.email.includes("@"),
    true,
  );
  // Verify role value
  TestValidator.equals(
    "admin role should be 'admin'",
    adminAccount.role,
    "admin",
  );
  // Verify status value
  TestValidator.equals(
    "admin status should be 'active'",
    adminAccount.status,
    "active",
  );
  // Verify date-time format for created_at
  TestValidator.predicate(
    "admin account creation date should be valid ISO 8601",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/.test(
      adminAccount.createdAt,
    ),
  );
}
