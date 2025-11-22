import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test comprehensive administrator profile retrieval to validate data
 * completeness and accuracy.
 *
 * The scenario includes: 1) Creating an administrator account with complete
 * personal information (first name, last name, email) through the creation
 * endpoint, 2) Creating a super admin account through join for authentication,
 * 3) Retrieving the administrator's profile information, 4) Validating that all
 * personal details, role level, account status, creation timestamp, and audit
 * information are accurately returned. This tests the system's ability to
 * provide complete administrative user information for system management
 * purposes.
 */
export async function test_api_administrator_profile_verification(
  connection: api.IConnection,
) {
  // 1. Authenticate as super admin for system access
  const superAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const superAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password_hash: "superAdmin123!@#",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(superAdmin);

  // 2. Create a test administrator with complete profile information
  const testAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const testAdmin: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: testAdminEmail,
        password_hash: "testAdmin123!@#",
        first_name: "John",
        last_name: "Doe",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(testAdmin);

  // 3. Retrieve the administrator's profile information
  const retrievedProfile: ITodoAppAdministrator.ISummary =
    await api.functional.todoApp.administrators.at(connection, {
      administratorId: testAdmin.id,
    });
  typia.assert(retrievedProfile);

  // 4. Validate that all personal details are correctly returned
  TestValidator.equals(
    "retrieved profile ID matches created administrator ID",
    retrievedProfile.id,
    testAdmin.id,
  );

  TestValidator.equals(
    "retrieved profile email matches created administrator email",
    retrievedProfile.email,
    testAdmin.email,
  );

  TestValidator.equals(
    "retrieved profile first name matches input",
    retrievedProfile.first_name,
    "John",
  );

  TestValidator.equals(
    "retrieved profile last name matches input",
    retrievedProfile.last_name,
    "Doe",
  );

  TestValidator.equals(
    "retrieved profile role level matches input",
    retrievedProfile.role_level,
    "admin",
  );

  // 5. Validate creation timestamp exists and is valid
  TestValidator.predicate(
    "creation timestamp is valid ISO 8601 format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      retrievedProfile.created_at,
    ),
  );

  // 6. Validate that audit information is complete and accurate
  TestValidator.predicate(
    "created timestamp is recent (within last hour)",
    new Date(retrievedProfile.created_at).getTime() >
      Date.now() - 60 * 60 * 1000,
  );
}
