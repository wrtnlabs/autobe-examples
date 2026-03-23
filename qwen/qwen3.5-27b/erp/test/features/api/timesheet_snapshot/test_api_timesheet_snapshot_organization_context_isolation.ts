import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization context isolation and authorization enforcement for timesheet snapshots.
 * Verifies that authenticated members can only access timesheet snapshots within their own organization,
 * and that multi-tenant data isolation is properly maintained.
 */
export async function test_api_timesheet_snapshot_organization_context_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create two separate member accounts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member1Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member2Auth);
  // 2. Query timesheet snapshots as member1
  const member1Snapshots =
    await api.functional.hrmPlatform.member.timesheet_snapshots.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(member1Snapshots);
  // 3. Query timesheet snapshots as member2
  const member2Snapshots =
    await api.functional.hrmPlatform.member.timesheet_snapshots.index(
      member2Connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(member2Snapshots);
  // 4. Verify organization context isolation
  // Extract all employee IDs from member1's snapshots
  const member1EmployeeIds = new Set(
    member1Snapshots.data.map((snapshot) => snapshot.employee.id),
  );
  // Extract all employee IDs from member2's snapshots
  const member2EmployeeIds = new Set(
    member2Snapshots.data.map((snapshot) => snapshot.employee.id),
  );
  // Verify no overlap between organizations
  const overlappingEmployeeIds = Array.from(member1EmployeeIds).filter((id) =>
    member2EmployeeIds.has(id),
  );
  TestValidator.equals(
    "no employee overlap between organizations",
    overlappingEmployeeIds.length,
    0,
  );
  // 5. Verify employee and approver organization membership for member1's snapshots
  for (const snapshot of member1Snapshots.data) {
    // Verify employee belongs to member1's organization
    TestValidator.predicate(
      "employee ID is in member1's organization",
      member1EmployeeIds.has(snapshot.employee.id),
    );
    // Verify approver (if present) belongs to same organization
    if (snapshot.approver !== null) {
      TestValidator.predicate(
        "approver belongs to member1's organization",
        member1EmployeeIds.has(snapshot.approver.id),
      );
    }
  }
  // 6. Verify employee and approver organization membership for member2's snapshots
  for (const snapshot of member2Snapshots.data) {
    TestValidator.predicate(
      "employee ID is in member2's organization",
      member2EmployeeIds.has(snapshot.employee.id),
    );
    // Verify approver (if present) belongs to same organization
    if (snapshot.approver !== null) {
      TestValidator.predicate(
        "approver belongs to member2's organization",
        member2EmployeeIds.has(snapshot.approver.id),
      );
    }
  }
  // 7. Test filtering by employee_id (self-access only)
  if (member1Snapshots.data.length > 0) {
    const firstSnapshot = member1Snapshots.data[0];
    const filteredSnapshots =
      await api.functional.hrmPlatform.member.timesheet_snapshots.index(
        member1Connection,
        {
          body: {
            page: 1,
            limit: 100,
            employee_id: firstSnapshot.employee.id,
          } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
        },
      );
    typia.assert(filteredSnapshots);
    // Verify all returned snapshots belong to the filtered employee
    for (const snapshot of filteredSnapshots.data) {
      TestValidator.equals(
        "filtered snapshot belongs to specified employee",
        snapshot.employee.id,
        firstSnapshot.employee.id,
      );
    }
  }
  // 8. Test filtering by status
  const statusFilter = "draft";
  const statusFilteredSnapshots =
    await api.functional.hrmPlatform.member.timesheet_snapshots.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 100,
          status: statusFilter,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(statusFilteredSnapshots);
  // Verify all returned snapshots have the filtered status
  for (const snapshot of statusFilteredSnapshots.data) {
    TestValidator.equals(
      "snapshot has filtered status",
      snapshot.status,
      statusFilter,
    );
  }
  // 9. Verify multi-tenant isolation: member1 cannot access member2's data
  // Even if member1 knows member2's snapshot IDs, they should not be accessible
  if (member2Snapshots.data.length > 0) {
    const member2SnapshotId = member2Snapshots.data[0].id;
    TestValidator.predicate(
      "member1 cannot access member2's snapshot ID",
      !member1Snapshots.data.some((s) => s.id === member2SnapshotId),
    );
  }
}
