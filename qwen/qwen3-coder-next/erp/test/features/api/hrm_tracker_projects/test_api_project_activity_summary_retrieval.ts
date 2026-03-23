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

export async function test_api_project_activity_summary_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // Create a new project with random data
  const project = await generate_random_hrm_tracker_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Retrieve activity summary for the project
  const activitySummary =
    await api.functional.hrmTracker.member.projects.activity_summary.summary(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(activitySummary);
  // Validate required fields exist with appropriate types
  TestValidator.predicate("has total count", activitySummary.total_count >= 0);
  TestValidator.predicate(
    "has activity breakdown",
    activitySummary.activity_breakdown !== null &&
      typeof activitySummary.activity_breakdown === "object",
  );
  TestValidator.predicate(
    "has date range",
    activitySummary.date_range !== null &&
      typeof activitySummary.date_range === "object",
  );
  TestValidator.predicate(
    "has start date",
    typeof activitySummary.date_range.start === "string",
  );
  TestValidator.predicate(
    "has end date",
    typeof activitySummary.date_range.end === "string",
  );
  TestValidator.predicate(
    "has first activity",
    typeof activitySummary.first_activity === "string",
  );
  TestValidator.predicate(
    "has last activity",
    typeof activitySummary.last_activity === "string",
  );
}
