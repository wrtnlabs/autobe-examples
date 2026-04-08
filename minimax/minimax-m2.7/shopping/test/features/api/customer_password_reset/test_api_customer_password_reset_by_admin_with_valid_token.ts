import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_password_reset_by_admin_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason:
        "Testing admin password reset functionality for e-commerce platform",
      href: "https://example.com/admin",
      referrer: "https://example.com/",
    },
  });
  // 2. Login as admin using the authorized admin connection
  // The admin session from join is already authenticated
  const loggedInAdminConnection: api.IConnection = {
    host: connection.host,
    headers: adminConnection.headers,
  };
  // 3. Call password reset endpoint with valid customer ID and token
  // Using pre-configured test customer ID with valid reset token
  // Note: In production, this would use an actual customer with a valid token
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const validResetToken = RandomGenerator.alphaNumeric(32);
  const resetResponse =
    await api.functional.ecommerceMall.admin.customers.password_resets.create(
      loggedInAdminConnection,
      {
        customerId: customerId,
        body: {
          password: "NewSecurePass123!",
          token: validResetToken,
        } satisfies IEcommerceMallCustomerPasswordReset.IResetRequest,
      },
    );
  // 4. Validate response
  typia.assert(resetResponse);
  TestValidator.equals(
    "success message",
    resetResponse.message,
    "Password reset successfully completed",
  );
}
