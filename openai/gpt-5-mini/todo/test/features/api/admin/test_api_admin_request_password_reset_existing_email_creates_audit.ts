import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Verify that requesting an admin password reset for an existing admin returns
 * a generic success message and does not disclose account existence or return
 * reset tokens in the API response.
 *
 * Steps:
 *
 * 1. Create an admin account via POST /auth/admin/join
 * 2. Initiate password reset via POST /auth/admin/password/reset with the created
 *    admin's email
 * 3. Assert the response is a generic success IMessage and does not include
 *    sensitive details such as the admin's email or a token
 *
 * Notes:
 *
 * - The test uses `satisfies` for request bodies and `typia.assert()` to validate
 *   response DTOs.
 * - Audit verification is not performed because no audit-read API was provided in
 *   the SDK. If available in the test environment, an additional audit query
 *   should assert an audit record with action_type 'request_password_reset' and
 *   target_id equal to the created admin id.
 */
export async function test_api_admin_request_password_reset_existing_email_creates_audit(
  connection: api.IConnection,
) {
  // 1) Prepare test data
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  // 2) Create the admin account
  const createdAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  // Validate the created admin DTO
  typia.assert(createdAdmin);

  // Basic sanity checks on returned admin
  TestValidator.predicate(
    "created admin has id",
    typeof createdAdmin.id === "string" && createdAdmin.id.length > 0,
  );
  TestValidator.equals(
    "created admin email matches input",
    createdAdmin.email,
    adminEmail,
  );

  // 3) Initiate password reset for the created admin
  const resetResponse: ITodoAppAdmin.IMessage =
    await api.functional.auth.admin.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies ITodoAppAdmin.IRequestPasswordReset,
      },
    );

  // Validate response DTO shape
  typia.assert(resetResponse);

  // 4) Business assertions
  TestValidator.predicate(
    "reset response contains a non-empty message",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );

  TestValidator.predicate(
    "reset response does not disclose the admin email",
    !resetResponse.message.includes(adminEmail),
  );

  TestValidator.predicate(
    "reset response does not include token-like text",
    !/token/i.test(resetResponse.message),
  );

  // Optional: If audit-read endpoints become available in the test
  // environment, query them (as an admin) and assert an audit record exists:
  // - action_type: 'request_password_reset'
  // - target_id: createdAdmin.id
  // Do NOT attempt to call any audit API here because it is not present in the
  // provided SDK. Add audit verification when such an endpoint is available.
}
