import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account using authorize_admin_join utility function
  // Store credentials in local variables for use in login
  const email = `${RandomGenerator.alphaNumeric(8)}@wrtn.io`;
  const password = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IAdmin.IJoin,
  });
  typia.assert(adminAccount); // Validates entire IAdmin.IAuthorized structure including id as UUID
  // Step 2: Perform admin login using authorize_admin_login utility function with stored credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IAdmin.ILogin,
  });
  typia.assert(loginResult); // Validates entire IAdmin.IAuthorized structure including token with all properties
  // Step 3: Verify the returned data structure through type system
  // The typia.assert(loginResult) has already validated everything:
  // - id is a valid UUID (from tags.Format<"uuid"> in IAdmin.IAuthorized)
  // - token exists and has access, refresh, expired_at, refreshable_until properties (from IAuthorizationToken type)
  // - expired_at and refreshable_until are in ISO 8601 date-time format (from tags.Format<"date-time"> in IAuthorizationToken)
  // No additional validation is needed or permitted
}
