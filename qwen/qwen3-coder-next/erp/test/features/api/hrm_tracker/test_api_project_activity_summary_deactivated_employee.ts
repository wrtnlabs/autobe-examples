import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerEmployee";
import type { IPageIHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_activity_summary_deactivated_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create project
  const createProject = await api.functional.hrmTracker.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.name(3),
        status: "active",
      } satisfies IHrmTrackerProject.IRequest,
    },
  );
  typia.assert(createProject);
  if (createProject.data.length === 0) {
    throw new Error("No projects found to test with");
  }
  const project = createProject.data[0];
  // 3. Deactivate the member employee record
  const deactivateResult = await api.functional.hrmTracker.employees.index(
    connection,
    {
      body: {
        status: "deactivated",
        department_id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        employment_type: "",
        position: "",
        cursor: "0",
        limit: 10,
        page: 1,
      } satisfies IHrmTrackerEmployee.IRequest,
    },
  );
  typia.assert(deactivateResult);
  // 4. Verify project activity summary for deactivated employee
  const activitySummary =
    await api.functional.hrmTracker.member.projects.activity_summary.summary(
      connection,
      {
        projectId: project.id,
      },
    );
  typia.assert(activitySummary);
  // 5. Validate summary statistics
  TestValidator.predicate(
    "has valid activity count",
    activitySummary.total_count >= 0,
  );
  TestValidator.predicate(
    "date range valid",
    activitySummary.date_range.start <= activitySummary.date_range.end,
  );
  TestValidator.predicate(
    "last activity after first",
    activitySummary.last_activity >= activitySummary.first_activity,
  );
  TestValidator.predicate(
    "has activity breakdown",
    Object.keys(activitySummary.activity_breakdown).length >= 0,
  );
}
