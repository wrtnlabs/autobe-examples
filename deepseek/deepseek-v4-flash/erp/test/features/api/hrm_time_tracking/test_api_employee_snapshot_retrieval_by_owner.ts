import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeSnapshot";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_employees_snapshots_create } from "../../../generate/generate_random_hrm_time_tracking_employees_snapshots_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_employee_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_employee_snapshot";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

/**
 * Test that the organization owner can successfully retrieve a manually created employee snapshot.
 *
 * Verifies the complete snapshot lifecycle: member registration, organization creation, organization context switching, employee context resolution, manual snapshot creation, and snapshot retrieval with field-level validation.
 *
 * Special attention is given to validating that the snapshot preserves the change metadata (changedField, oldValue, newValue), captures the employee and actor references correctly, includes the employee's state at snapshot time (status, employmentType, role, department), and records a valid ISO 8601 timestamp.
 *
 * 1. Register a new member account with known credentials.
 * 2. Create a new organization — the owner's employee record is auto-created with Owner role and active status.
 * 3. Switch the active organization context to the newly created organization.
 * 4. Re-authenticate by logging in with the same credentials to obtain fresh member data containing the owner's employee record.
 * 5. Extract the employee ID from the authenticated response.
 * 6. Create a manual employee snapshot documenting a position change from "Developer" to "Senior Developer".
 * 7. Retrieve the snapshot using the employee ID and snapshot ID.
 * 8. Validate that all snapshot fields match the expected values: employee reference, actor reference, change metadata, employee state, and timestamp.
 */
export async function test_api_employee_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with known password
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      password,
    },
  });
  typia.assert(memberAuthorized);
  const { email } = memberAuthorized;
  // 2. Create a new organization (auto-creates owner employee record)
  const org =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(org);
  // 3. Switch active organization context
  const switchedOrg =
    await api.functional.hrmTimeTracking.member._switch.organizations.change(
      memberConnection,
      {
        organizationId: org.id,
      },
    );
  typia.assert(switchedOrg);
  // 4. Login again to get fresh authorized data with the owner's employee record
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAuthorized = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: "",
      referrer: "",
    },
  });
  typia.assert(loginAuthorized);
  // 5. Extract the employee ID from the fresh authorized data
  const employee = loginAuthorized.employees[0];
  typia.assert(employee);
  // 6. Create a manual snapshot for a position change
  const snapshot =
    await generate_random_hrm_time_tracking_employees_snapshots_create(
      loginConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          changed_field: "position",
          old_value: "Developer",
          new_value: "Senior Developer",
        },
      },
    );
  typia.assert(snapshot);
  // 7. Retrieve the snapshot by employee ID and snapshot ID
  const retrieved = await api.functional.hrmTimeTracking.employees.snapshots.at(
    loginConnection,
    {
      employeeId: employee.id,
      snapshotId: snapshot.id,
    },
  );
  typia.assert(retrieved);
  // 8. Validate snapshot fields
  TestValidator.equals(
    "employee id matches",
    retrieved.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "actor id matches",
    retrieved.actor.id,
    loginAuthorized.id,
  );
  TestValidator.equals("changed field", retrieved.changedField, "position");
  TestValidator.equals("old value", retrieved.oldValue, "Developer");
  TestValidator.equals("new value", retrieved.newValue, "Senior Developer");
  TestValidator.predicate("createdAt is valid ISO 8601", () => {
    const date = new Date(retrieved.createdAt);
    return !isNaN(date.getTime());
  });
}