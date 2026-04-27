import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";

export async function test_api_project_members_search_by_employee_name(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Setup: Create 3 member accounts with specific display names
  //----
  // Alice Johnson
  const aliceConn: api.IConnection = { host: connection.host };
  const aliceEmail = typia.random<string & tags.Format<"email">>();
  const alicePassword = RandomGenerator.alphaNumeric(16);
  const aliceJoin = await authorize_member_join(aliceConn, {
    body: {
      email: aliceEmail satisfies string,
      password: alicePassword satisfies string,
      display_name: "Alice Johnson",
    },
  });
  typia.assert(aliceJoin);
  // Bob Smith
  const bobConn: api.IConnection = { host: connection.host };
  await authorize_member_join(bobConn, {
    body: {
      display_name: "Bob Smith",
    },
  });
  // Charlie Johnson
  const charlieConn: api.IConnection = { host: connection.host };
  await authorize_member_join(charlieConn, {
    body: {
      display_name: "Charlie Johnson",
    },
  });
  //----
  // Organization & Project Setup (as Alice)
  //----
  // Create organization - Alice becomes owner employee
  const org =
    await generate_random_hrm_time_tracking_member_organizations_create(
      aliceConn,
      {},
    );
  typia.assert(org);
  // Login as Alice again to get the updated employee record
  const aliceLogin = await authorize_member_login(aliceConn, {
    body: {
      email: aliceEmail,
      password: alicePassword,
    } as IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(aliceLogin);
  const aliceEmployeeId = aliceLogin.employees[0]!.id;
  // Create project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      aliceConn,
      {},
    );
  typia.assert(project);
  // Add Alice's employee as a project member
  const aliceMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      aliceConn,
      {
        body: {
          employee_id: aliceEmployeeId,
          role: "member",
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(aliceMember);
  //----
  // Test 1: Search with employeeName "Johnson"
  //----
  const resultJohnson =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      aliceConn,
      {
        projectId: project.id,
        body: {
          employeeName: "Johnson",
        },
      },
    );
  typia.assert(resultJohnson);
  TestValidator.equals("Johnson search count", resultJohnson.data.length, 1);
  TestValidator.predicate(
    "Alice Johnson is in results",
    resultJohnson.data.some(
      (m) => m.employee.member.display_name === "Alice Johnson",
    ),
  );
  TestValidator.equals(
    "pagination records reflect filtered count",
    resultJohnson.pagination.records,
    1,
  );
  //----
  // Test 2: Search with employeeName "Smith" — expect 0 results
  //----
  const resultSmith =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      aliceConn,
      {
        projectId: project.id,
        body: {
          employeeName: "Smith",
        },
      },
    );
  typia.assert(resultSmith);
  TestValidator.equals(
    "Smith search count (no matches)",
    resultSmith.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records for Smith",
    resultSmith.pagination.records,
    0,
  );
  //----
  // Test 3: Search without employeeName — expect all members
  //----
  const resultAll =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      aliceConn,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(resultAll);
  TestValidator.equals("all members count", resultAll.data.length, 1);
  TestValidator.equals(
    "all pagination records",
    resultAll.pagination.records,
    1,
  );
  TestValidator.predicate(
    "Alice Johnson is in all results",
    resultAll.data.some(
      (m) => m.employee.member.display_name === "Alice Johnson",
    ),
  );
}
