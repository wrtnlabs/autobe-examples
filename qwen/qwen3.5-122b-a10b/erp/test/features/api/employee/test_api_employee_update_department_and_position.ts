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
 * Test employee department and position update within an organization.
 *
 * Validates the successful update of an employee record through the HRM member API. This test performs a partial update on an existing employee, verifying that the API accepts the update request and returns a valid employee entity.
 *
 * Note: The current DTO definition for IHrmEmployee.IUpdate is empty, representing a partial update where no specific fields are modified. In a complete implementation, this would include department_id and position fields.
 *
 * The test follows the member authentication flow and performs an update operation on an employee record, validating the response structure and timestamp updates.
 *
 * 1. Member authenticates with email and password credentials.
 * 2. Generate UUIDs for organization and employee (fixtures assumed to exist).
 * 3. Send PUT request with empty update body (partial update pattern).
 * 4. Verify response contains valid employee entity.
 * 5. Validate updated_at timestamp reflects the operation.
 */
export async function test_api_employee_update_department_and_position(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Generate test data for update
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Capture current timestamp before update
  const beforeUpdate: string & tags.Format<"date-time"> =
    new Date().toISOString();
  // 4. Update employee (partial update with empty body)
  // Note: IHrmEmployee.IUpdate is currently empty; in production this would
  // include department_id and position fields for actual updates
  const updatedEmployee: IHrmEmployee =
    await api.functional.hrm.member.organizations.employees.update(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {} satisfies IHrmEmployee.IUpdate,
      },
    );
  typia.assert(updatedEmployee);
  // 5. Validate response structure
  TestValidator.equals("employee id returned", updatedEmployee.id, employeeId);
  // 6. Validate timestamp was updated
  TestValidator.predicate(
    "updated_at is newer than before update",
    () => updatedEmployee.updated_at >= beforeUpdate,
  );
}
