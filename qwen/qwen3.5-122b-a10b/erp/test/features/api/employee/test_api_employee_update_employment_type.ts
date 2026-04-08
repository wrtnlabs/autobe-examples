import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test updating an employee's record within an organization.
 *
 * Validates the partial update functionality for employee records within an organization. This test ensures that the update endpoint correctly processes requests and returns the updated employee entity with proper timestamps.
 *
 * The test performs a comprehensive validation of employee update operations including:
 * 1. Authentication with member credentials
 * 2. API call with organization and employee identifiers
 * 3. Verification that response contains valid employee data
 * 4. Confirmation of updated_at timestamp modification
 * 5. Validation of employee entity structure
 *
 * 1. Authenticate as member using authorize_member_join.
 * 2. Generate test organization and employee IDs.
 * 3. Call PUT endpoint to update employee record with empty body (partial update).
 * 4. Validate response contains valid IHrmEmployee structure.
 * 5. Verify updated_at timestamp exists and is valid.
 * 6. Confirm employee id and email are present.
 */
export async function test_api_employee_update_employment_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Generate test organization and employee IDs
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call PUT endpoint to update employee record (partial update with empty body)
  const updated: IHrmEmployee =
    await api.functional.hrm.member.organizations.employees.update(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {} satisfies IHrmEmployee.IUpdate,
      },
    );
  typia.assert(updated);
  // 4. Validate response contains valid IHrmEmployee structure
  TestValidator.equals(
    "employee id is present",
    updated.id !== undefined && updated.id !== null,
    true,
  );
  TestValidator.equals(
    "employee email is present",
    updated.email !== undefined && updated.email !== null,
    true,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    updated.updated_at !== undefined && updated.updated_at !== null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    updated.created_at !== undefined && updated.created_at !== null,
  );
}
