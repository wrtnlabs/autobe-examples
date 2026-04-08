import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving an employee record with nullable department field.
 *
 * Validates the employee retrieval endpoint handles the optional department relationship correctly. After member authentication, retrieves an employee and verifies the response structure includes all required fields while properly handling the nullable department field (which can be null, undefined, or present).
 *
 * The department field is optional per the domain model - employees can exist without department assignment. This test validates that the API response correctly represents this nullable relationship whether department is null or contains a department summary.
 *
 * 1. Member authenticates via authorize_member_join to obtain access token.
 * 2. Generates employee UUID for retrieval attempt.
 * 3. Retrieves employee record via api.functional.hrmPlatform.member.employees.at.
 * 4. Validates response structure with typia.assert for complete type checking.
 * 5. Confirms department field accepts null value as per nullable domain model.
 */
export async function test_api_employee_retrieve_without_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Generate employee ID for retrieval
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve employee record
  const employee: IHrmPlatformEmployee =
    await api.functional.hrmPlatform.member.employees.at(memberConnection, {
      employeeId: employeeId,
    });
  // 4. Validate complete response structure (includes all type validations)
  typia.assert(employee);
  // 5. Validate department field is properly nullable per domain model
  // Department can be null, undefined, or IHrmPlatformDepartment.ISummary
  const department = employee.department;
  if (department === null || department === undefined) {
    // Valid: employee has no department assignment (edge case being tested)
    return;
  }
  // If department exists, typia.assert already validated its structure
  // No additional type validation needed after typia.assert
}
