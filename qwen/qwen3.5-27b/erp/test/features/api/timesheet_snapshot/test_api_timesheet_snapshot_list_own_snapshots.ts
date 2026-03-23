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

export async function test_api_timesheet_snapshot_list_own_snapshots(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path for retrieving timesheet snapshots.
   * 1. Authenticate as a member
   * 2. Call the timesheet snapshots endpoint with no filters
   * 3. Verify paginated response with snapshot summaries
   * 4. Validate snapshot structure and ordering
   */
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Call timesheet snapshots endpoint with no filters
  const snapshots =
    await api.functional.hrmPlatform.member.timesheet_snapshots.index(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    snapshots.pagination.pages >= 0,
  );
  // 4. Verify data array exists
  TestValidator.predicate(
    "snapshots data array exists",
    Array.isArray(snapshots.data),
  );
  // 5. Validate each snapshot structure
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    typia.assert(snapshot);
    // Validate snapshot ID
    TestValidator.predicate(
      `snapshot has valid UUID: ${snapshot.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    // Validate timesheet reference ID
    TestValidator.predicate(
      `snapshot has valid timesheet reference: ${snapshot.hrm_platform_timesheet_id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.hrm_platform_timesheet_id,
      ),
    );
    // Validate employee information
    typia.assert(snapshot.employee);
    TestValidator.predicate(
      `employee has valid ID: ${snapshot.employee.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.employee.id,
      ),
    );
    TestValidator.predicate(
      "employee has employment type",
      snapshot.employee.employment_type !== null &&
        snapshot.employee.employment_type !== undefined,
    );
    TestValidator.predicate(
      "employee has status",
      snapshot.employee.status !== null &&
        snapshot.employee.status !== undefined,
    );
    TestValidator.predicate(
      "employee has member information",
      snapshot.employee.member !== null &&
        snapshot.employee.member !== undefined,
    );
    typia.assert(snapshot.employee.member);
    TestValidator.predicate(
      `employee member has valid email: ${snapshot.employee.member.email}`,
      snapshot.employee.member.email.includes("@"),
    );
    TestValidator.predicate(
      "employee has role information",
      snapshot.employee.role !== null && snapshot.employee.role !== undefined,
    );
    typia.assert(snapshot.employee.role);
    // Validate week start date
    TestValidator.predicate(
      `snapshot has valid week start date: ${snapshot.week_start_date}`,
      !isNaN(Date.parse(snapshot.week_start_date)),
    );
    // Validate status
    TestValidator.predicate(
      "snapshot has status",
      snapshot.status !== null && snapshot.status !== undefined,
    );
    // Validate total hours
    TestValidator.predicate(
      `snapshot has valid total hours: ${snapshot.total_hours}`,
      typeof snapshot.total_hours === "number" && snapshot.total_hours >= 0,
    );
    // Validate timestamps (nullable)
    if (snapshot.submitted_at !== null) {
      TestValidator.predicate(
        `snapshot has valid submitted_at: ${snapshot.submitted_at}`,
        !isNaN(Date.parse(snapshot.submitted_at)),
      );
    }
    if (snapshot.approved_at !== null) {
      TestValidator.predicate(
        `snapshot has valid approved_at: ${snapshot.approved_at}`,
        !isNaN(Date.parse(snapshot.approved_at)),
      );
    }
    if (snapshot.rejected_at !== null) {
      TestValidator.predicate(
        `snapshot has valid rejected_at: ${snapshot.rejected_at}`,
        !isNaN(Date.parse(snapshot.rejected_at)),
      );
    }
    // Validate approver (nullable)
    if (snapshot.approver !== null) {
      typia.assert(snapshot.approver);
      TestValidator.predicate(
        `approver has valid ID: ${snapshot.approver.id}`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.approver.id,
        ),
      );
    }
    // Validate rejection reason (nullable)
    // No specific validation needed - can be null or string
    // Validate created_at
    TestValidator.predicate(
      `snapshot has valid created_at: ${snapshot.created_at}`,
      !isNaN(Date.parse(snapshot.created_at)),
    );
  });
  // 6. Verify snapshots are ordered by created_at descending (most recent first)
  if (snapshots.data.length > 1) {
    for (let i = 1; i < snapshots.data.length; i++) {
      const prevDate = new Date(snapshots.data[i - 1].created_at).getTime();
      const currDate = new Date(snapshots.data[i].created_at).getTime();
      TestValidator.predicate(
        `snapshots are ordered by created_at descending (index ${i - 1} vs ${i})`,
        prevDate >= currDate,
      );
    }
  }
  // 7. Verify organization context isolation - all snapshots belong to authenticated member
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    TestValidator.equals(
      `snapshot employee member ID matches authenticated member: ${snapshot.employee.member.id}`,
      snapshot.employee.member.id,
      authorized.id,
    );
  });
}
