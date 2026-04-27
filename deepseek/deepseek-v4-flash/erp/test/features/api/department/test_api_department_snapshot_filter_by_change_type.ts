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

export async function test_api_department_snapshot_filter_by_change_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create department ("Marketing") — generates 'created' snapshot
  const department =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Marketing",
        },
      },
    );
  typia.assert(department);
  // 4. First update: change name to "Marketing Team" — generates first 'updated' snapshot
  const updatedDept1 =
    await api.functional.hrmTimeTracking.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          name: "Marketing Team",
        },
      },
    );
  typia.assert(updatedDept1);
  // 5. Second update: change description — generates second 'updated' snapshot
  const updatedDept2 =
    await api.functional.hrmTimeTracking.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          name: "Marketing Team",
          description:
            "Marketing department responsible for promotional activities and brand management",
        },
      },
    );
  typia.assert(updatedDept2);
  // 6. Query snapshot history filtered by change_type='updated'
  const snapshotPage =
    await api.functional.hrmTimeTracking.member.departments.snapshots.index(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          change_type: "updated",
          page: 1,
          limit: 100,
          sort: "created_at_asc",
        },
      },
    );
  typia.assert(snapshotPage);
  // 7. Assert only the 2 'updated' snapshots are returned
  TestValidator.equals("updated snapshot count", snapshotPage.data.length, 2);
  // 8. Assert each returned snapshot has the correct change type
  for (const snapshot of snapshotPage.data) {
    TestValidator.equals(
      "change type is updated",
      snapshot.changeType,
      "updated",
    );
  }
  // 9. Assert pagination metadata reflects the filtered count
  TestValidator.equals(
    "total filtered records in pagination",
    snapshotPage.pagination.records,
    2,
  );
}
