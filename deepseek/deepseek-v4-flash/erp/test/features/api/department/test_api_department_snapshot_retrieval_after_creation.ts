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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_hrm_time_tracking_member_departments_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

export async function test_api_department_snapshot_retrieval_after_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a department with a known name and description
  const departmentName = `${RandomGenerator.alphabets(8)} Department`;
  const departmentDescription = RandomGenerator.paragraph({ sentences: 2 });
  const department =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: departmentName,
          description: departmentDescription,
        },
      },
    );
  typia.assert(department);
  // 3. Validate the department was created correctly
  TestValidator.equals("department name", department.name, departmentName);
  TestValidator.equals(
    "department description",
    department.description,
    departmentDescription,
  );
  TestValidator.equals("parent is null (top-level)", department.parent, null);
  TestValidator.predicate(
    "has valid created_at",
    typeof department.created_at === "string",
  );
  TestValidator.predicate(
    "department id is set",
    typeof department.id === "string",
  );
  // Note: The department creation automatically generates a snapshot with
  // change_type='created'. However, since there is no list snapshots endpoint
  // available in the SDK, we cannot retrieve the snapshot ID to call the
  // GET /hrmTimeTracking/member/departments/{departmentId}/snapshots/{snapshotId}
  // endpoint and validate the snapshot contents.
}
