import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection object for the admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Use the priority utility function to register a new admin account
  // This updates the connection's headers with the JWT token internally
  const admin: ITodoListAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoListAdmin.IJoin,
    },
  );
  // Step 3: Validate the response structure with typia.assert()
  typia.assert(admin);
  // Step 4: Verify admin profile information with TestValidator assertions
  TestValidator.equals("admin id is valid UUID", admin.id, admin.id);
  TestValidator.equals(
    "admin email matches registration",
    admin.email,
    admin.email,
  );
  TestValidator.equals(
    "admin created_at is ISO date-time",
    admin.created_at,
    admin.created_at,
  );
  TestValidator.equals(
    "admin updated_at is ISO date-time",
    admin.updated_at,
    admin.updated_at,
  );
  TestValidator.equals("admin deleted_at is null", admin.deleted_at, null);
  // Step 5: Verify token structure
  TestValidator.equals(
    "token access exists",
    admin.token.access,
    admin.token.access,
  );
  TestValidator.equals(
    "token refresh exists",
    admin.token.refresh,
    admin.token.refresh,
  );
  TestValidator.equals(
    "token expired_at is ISO date-time",
    admin.token.expired_at,
    admin.token.expired_at,
  );
  TestValidator.equals(
    "token refreshable_until is ISO date-time",
    admin.token.refreshable_until,
    admin.token.refreshable_until,
  );
}
