import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_requests_create } from "../../../generate/generate_random_ecommerce_requests_create";
import { prepare_random_ecommerce_admin_request } from "../../../prepare/prepare_random_ecommerce_admin_request";

/**
 * Test that an existing administrator cannot submit a new administrator access request.
 *
 * Validates the business rule that users who already possess administrator privileges cannot submit additional admin access requests. The system should reject such submissions with a validation error (400).
 *
 * **Prerequisites**
 *
 * This test requires an existing administrator account with valid credentials. The admin account must be pre-created in the test database through test data setup, as there is no API endpoint to create administrator accounts directly.
 *
 * **Test Flow**
 *
 * 1. Authenticate as an existing administrator using pre-configured credentials
 * 2. Attempt to submit an administrator access request
 * 3. Validate that the system returns a 400 error indicating the user is already an administrator
 *
 * @param connection HTTP connection configuration
 */
export async function test_api_admin_request_already_admin_blocked(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: This test requires a pre-existing admin account in the test database.
  // Admin accounts cannot be created via API - they must be set up through test data initialization.
  // The following credentials should be configured in your test environment setup.
  // 1. Authenticate as existing administrator
  // Replace with actual admin credentials from test setup
  const adminEmail = "admin@test.com"; // Configured in test data setup
  const adminPassword = "admin123"; // Configured in test data setup
  const adminConnection: api.IConnection = { host: connection.host };
  try {
    // Attempt to authenticate as admin (this will succeed if admin exists in test DB)
    const adminAuth = await api.functional.ecommerce.auth.customer.login(
      adminConnection,
      {
        body: {
          email: adminEmail,
          password: adminPassword,
        },
      },
    );
    typia.assert(adminAuth);
    // 2. Attempt to submit admin request as existing administrator
    // This should fail with 400 error since user is already an admin
    await TestValidator.httpError(
      "existing admin cannot submit duplicate admin request",
      400,
      async () => {
        await api.functional.ecommerce.requests.create(adminConnection, {
          body: {
            reason: "Testing duplicate admin request blocking",
          } satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest").IEcommerceAdminRequest.ICreate,
        });
      },
    );
  } catch (error) {
    // If admin authentication fails, the admin account doesn't exist in test DB
    // This indicates test setup issue - admin account must be pre-created
    if (error instanceof Error && error.message.includes("401")) {
      throw new Error(
        "Test prerequisite failed: Admin account does not exist. " +
          "Please ensure admin account is pre-created in test database with credentials " +
          `${adminEmail}/${adminPassword}`,
      );
    }
    throw error;
  }
}
