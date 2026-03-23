import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";

export async function test_api_project_activity_summary_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with verification
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create project with member as project-lead (memberConnection already has token from authorization)
  const project = await api.functional.hrmTracker.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        description: RandomGenerator.content({ paragraphs: 1 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Retrieve activity summary as project-lead
  const activitySummary =
    await api.functional.hrmTracker.member.projects.activity_summary.summary(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(activitySummary);
  // 4. Validate activity summary structure (initial state - no activity logs yet)
  TestValidator.equals(
    "initial total count is 0",
    activitySummary.total_count,
    0,
  );
  TestValidator.equals(
    "initial activity breakdown is empty",
    Object.keys(activitySummary.activity_breakdown).length,
    0,
  );
  TestValidator.predicate(
    "has valid date range",
    activitySummary.date_range.start <= activitySummary.date_range.end,
  );
  TestValidator.predicate(
    "first activity before or equal last activity",
    activitySummary.first_activity <= activitySummary.last_activity,
  );
}
