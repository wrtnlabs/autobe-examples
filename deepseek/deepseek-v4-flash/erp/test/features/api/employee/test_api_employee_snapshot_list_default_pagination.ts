import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeSnapshot";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_employees_snapshots_create } from "../../../generate/generate_random_hrm_time_tracking_employees_snapshots_create";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_employee_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_employee_snapshot";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

/**
 * Test listing employee snapshot history with default pagination.
 *
 * Validates that the PATCH /employees/{employeeId}/snapshots endpoint returns
 * properly paginated results when called with an empty request body (default
 * pagination). Verifies that pagination metadata reflects the correct counts,
 * snapshots are ordered by most recent first, and each snapshot contains the
 * expected structure including actor, role, and department fields.
 *
 * 1. Register Member A (owner) and create an organization.
 * 2. Re-authenticate the owner to obtain the owner's employee record.
 * 3. Create 3 manual snapshots for the owner's employee record with different
 *    changed_field values.
 * 4. List snapshots with default pagination (empty request body).
 * 5. Validate pagination metadata: current=1, limit=20, records=3, pages=1.
 * 6. Validate each snapshot includes proper actor, role, and department data.
 */
export async function test_api_employee_snapshot_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create owner (Member A)
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const ownerPassword: string = RandomGenerator.alphaNumeric(16);
  const ownerDisplayName: string = RandomGenerator.name();
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: ownerEmail,
        password: ownerPassword,
        display_name: ownerDisplayName,
      },
    });
  typia.assert(ownerAuthorized);
  // Create organization (Member A becomes the owner employee)
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Re-authenticate the owner to get the updated profile with employee record
  // (the initial join happened before org creation, so employees were empty)
  const reAuthConnection: api.IConnection = { host: connection.host };
  const reAuthorized: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_login(reAuthConnection, {
      body: {
        email: ownerEmail,
        password: ownerPassword,
      } as IHrmTimeTrackingMember.ILogin,
    });
  typia.assert(reAuthorized);
  // Get the owner's employee record in the newly created organization
  const ownerEmployee: IHrmTimeTrackingEmployee.ISummary | undefined =
    reAuthorized.employees.find((emp) => emp.member.id === ownerAuthorized.id);
  if (ownerEmployee === undefined)
    throw new Error("Owner employee record not found after org creation");
  const ownerEmployeeId: string = ownerEmployee.id;
  // Create 3 manual snapshots for the owner's employee record
  const snapshot1: IHrmTimeTrackingEmployeeSnapshot =
    await generate_random_hrm_time_tracking_employees_snapshots_create(
      ownerConnection,
      {
        body: {
          changed_field: "position",
          old_value: null,
          new_value: "Senior Engineer",
        },
        params: {
          employeeId: ownerEmployeeId,
        },
      },
    );
  typia.assert(snapshot1);
  // Small delay to ensure distinct created_at timestamps for ordering
  await new Promise((resolve) => setTimeout(resolve, 100));
  const snapshot2: IHrmTimeTrackingEmployeeSnapshot =
    await generate_random_hrm_time_tracking_employees_snapshots_create(
      ownerConnection,
      {
        body: {
          changed_field: "status",
          old_value: "active",
          new_value: "deactivated",
        },
        params: {
          employeeId: ownerEmployeeId,
        },
      },
    );
  typia.assert(snapshot2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const snapshot3: IHrmTimeTrackingEmployeeSnapshot =
    await generate_random_hrm_time_tracking_employees_snapshots_create(
      ownerConnection,
      {
        body: {
          changed_field: "employment_type",
          old_value: null,
          new_value: "full-time",
        },
        params: {
          employeeId: ownerEmployeeId,
        },
      },
    );
  typia.assert(snapshot3);
  // List snapshots with default pagination (empty request body)
  const page: IPageIHrmTimeTrackingEmployeeSnapshot.ISummary =
    await api.functional.hrmTimeTracking.employees.snapshots.index(
      ownerConnection,
      {
        employeeId: ownerEmployeeId,
        body: {},
      },
    );
  typia.assert(page);
  // Validate pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  TestValidator.equals("pagination records", page.pagination.records, 3);
  TestValidator.equals("pagination pages", page.pagination.pages, 1);
  // Validate data array has 3 items
  TestValidator.equals("snapshot count", page.data.length, 3);
  // Validate snapshots are sorted by created_at descending (most recent first)
  const createdAts: string[] = page.data.map((s) => s.created_at);
  for (let i: number = 1; i < createdAts.length; i++)
    TestValidator.predicate(
      `snapshot[${i - 1}] created_at >= snapshot[${i}]`,
      () => createdAts[i - 1] >= createdAts[i],
    );
  // Find the position snapshot and validate its content
  const positionSnapshot:
    | IHrmTimeTrackingEmployeeSnapshot.ISummary
    | undefined = page.data.find((s) => s.changed_field === "position");
  if (positionSnapshot === undefined)
    throw new Error("position snapshot not found");
  TestValidator.equals("position snapshot changed_field", positionSnapshot.changed_field, "position");
  TestValidator.equals("position snapshot old_value", positionSnapshot.old_value, null);
  TestValidator.equals("position snapshot new_value", positionSnapshot.new_value, "Senior Engineer");
  // Validate each snapshot has required structure
  for (const snapshot of page.data) {
    // actor must be a valid member summary
    typia.assert(snapshot.actor);
    // role must be a valid role summary
    typia.assert(snapshot.role);
    // department should be null since no department was assigned
    TestValidator.equals("snapshot department", snapshot.department, null);
  }
}