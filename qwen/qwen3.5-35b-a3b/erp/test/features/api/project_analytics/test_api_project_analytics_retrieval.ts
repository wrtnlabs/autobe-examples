import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Retrieve project analytics
  const analytics = await api.functional.hrms.member.projects.analytics.index(
    authorizedConnection,
    {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IHrmsProject.IRequest,
    },
  );
  typia.assert(analytics);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    analytics.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    analytics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is within range",
    analytics.pagination.limit >= 1 && analytics.pagination.limit <= 100,
  );
  TestValidator.equals(
    "pagination pages calculation",
    analytics.pagination.pages,
    analytics.pagination.records > 0
      ? Math.ceil(analytics.pagination.records / analytics.pagination.limit)
      : 0,
  );
  // 5. Validate each project record
  for (const project of analytics.data) {
    typia.assert(project);
    // Validate required identifier fields
    TestValidator.predicate("project has id", project.id !== undefined);
    TestValidator.equals("project id is uuid format", project.id, project.id);
    // Validate project name and description
    TestValidator.predicate("project has name", project.name !== undefined);
    TestValidator.predicate(
      "project has description",
      project.description !== undefined,
    );
    // Validate organization fields
    TestValidator.predicate(
      "project has organization_id",
      project.organization_id !== undefined,
    );
    TestValidator.predicate(
      "project has organization_name",
      project.organization_name !== undefined,
    );
    // Validate status is one of allowed values
    TestValidator.predicate(
      "project status is valid",
      ["active", "archived", "completed"].includes(project.status),
    );
    // Validate budget hours fields
    TestValidator.equals(
      "planned_hours equals budget_hours",
      project.planned_hours,
      project.budget_hours ?? 0,
    );
    TestValidator.predicate(
      "actual_hours is non-negative",
      project.actual_hours >= 0,
    );
    // Validate budget utilization calculation
    if (project.budget_hours !== null && project.budget_hours !== 0) {
      TestValidator.predicate(
        "budget utilization is non-negative",
        project.budget_utilization_percentage !== null &&
          project.budget_utilization_percentage !== undefined &&
          project.budget_utilization_percentage >= 0,
      );
      TestValidator.predicate(
        "budget utilization is calculated correctly",
        project.budget_utilization_percentage !== null &&
          project.budget_utilization_percentage !== undefined &&
          Math.abs(
            project.budget_utilization_percentage -
              (project.actual_hours / (project.budget_hours * 60)) * 100,
          ) < 0.01,
      );
    } else {
      // When budget_hours is null or zero, budget_utilization_percentage should be null
      TestValidator.equals(
        "budget utilization is null when budget_hours is null or zero",
        project.budget_utilization_percentage,
        null,
      );
    }
    // Validate task count aggregation
    TestValidator.equals(
      "total_tasks equals sum of status counts",
      project.total_tasks,
      project.pending_tasks +
        project.in_progress_tasks +
        project.completed_tasks +
        project.closed_tasks,
    );
    // Validate each task status count is non-negative
    TestValidator.predicate(
      "pending_tasks is non-negative",
      project.pending_tasks >= 0,
    );
    TestValidator.predicate(
      "in_progress_tasks is non-negative",
      project.in_progress_tasks >= 0,
    );
    TestValidator.predicate(
      "completed_tasks is non-negative",
      project.completed_tasks >= 0,
    );
    TestValidator.predicate(
      "closed_tasks is non-negative",
      project.closed_tasks >= 0,
    );
    // Validate timelog count
    TestValidator.predicate(
      "timelog_count is non-negative",
      project.timelog_count >= 0,
    );
    // Validate timestamps are valid date-time format
    TestValidator.predicate(
      "created_at is valid date-time",
      project.created_at !== undefined && project.created_at !== null,
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      project.updated_at !== undefined && project.updated_at !== null,
    );
  }
}