import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartmentSnapshot";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingDepartmentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_hrm_time_tracking_member_departments_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_department_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a department (generates 'created' snapshot #1)
  const department =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Sales",
        },
      },
    );
  typia.assert(department);
  // 4. Perform 15+ updates to generate enough snapshots for pagination testing
  const UPDATE_COUNT = 15;
  for (let i = 0; i < UPDATE_COUNT; i++) {
    const updated =
      await api.functional.hrmTimeTracking.member.departments.update(
        memberConnection,
        {
          departmentId: department.id,
          body: {
            name: `Sales ${RandomGenerator.alphabets(8)}`,
          } satisfies IHrmTimeTrackingDepartment.IUpdate,
        },
      );
    typia.assert(updated);
  }
  // Total snapshots = 1 (created) + 15 (updates) = 16
  const TOTAL_SNAPSHOTS = 1 + UPDATE_COUNT;
  // 5. Query page 1 with limit=5
  const page1 =
    await api.functional.hrmTimeTracking.member.departments.snapshots.index(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IHrmTimeTrackingDepartmentSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // Assert page 1 has exactly 5 snapshots
  TestValidator.equals("page 1 snapshot count", page1.data.length, 5);
  // Assert pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals(
    "page 1 records",
    page1.pagination.records,
    TOTAL_SNAPSHOTS,
  );
  TestValidator.equals("page 1 pages", page1.pagination.pages, 4);
  // 6. Query page 2 with limit=5
  const page2 =
    await api.functional.hrmTimeTracking.member.departments.snapshots.index(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IHrmTimeTrackingDepartmentSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  // Assert page 2 has exactly 5 snapshots
  TestValidator.equals("page 2 snapshot count", page2.data.length, 5);
  // Assert pagination metadata
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals(
    "page 2 records",
    page2.pagination.records,
    TOTAL_SNAPSHOTS,
  );
  TestValidator.equals("page 2 pages", page2.pagination.pages, 4);
  // 7. Ensure no overlap between page 1 and page 2
  const page1Ids = new Set(page1.data.map((s) => s.id));
  const page2Ids = new Set(page2.data.map((s) => s.id));
  const overlap = [...page2Ids].filter((id) => page1Ids.has(id));
  TestValidator.equals("no overlap between pages", overlap.length, 0);
  // 8. Verify snapshots are in descending order by createdAt
  for (let i = 1; i < page1.data.length; i++) {
    TestValidator.predicate(
      `page1 snapshot[${i - 1}] created_at >= snapshot[${i}]`,
      () => page1.data[i - 1].createdAt >= page1.data[i].createdAt,
    );
  }
  for (let i = 1; i < page2.data.length; i++) {
    TestValidator.predicate(
      `page2 snapshot[${i - 1}] created_at >= snapshot[${i}]`,
      () => page2.data[i - 1].createdAt >= page2.data[i].createdAt,
    );
  }
  // Verify cross-page ordering: last of page1 >= first of page2
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.predicate(
      "cross-page descending order",
      () =>
        page1.data[page1.data.length - 1].createdAt >= page2.data[0].createdAt,
    );
  }
}
