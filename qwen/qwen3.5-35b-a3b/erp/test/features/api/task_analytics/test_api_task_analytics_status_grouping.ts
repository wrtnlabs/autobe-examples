import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTaskAnalyticGrouping } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskAnalyticGrouping";
import type { IHrmsTaskParentTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskParentTaskFilter";
import type { IHrmsTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskPriority";
import type { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_analytics_status_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Test status grouping analytics
  const statusAnalytics =
    await api.functional.hrms.member.projects.tasks.analytics(
      memberConnection,
      {
        body: {
          grouping: {
            group_by: "status",
            include_subtasks: true,
            include_empty_groups: false,
          },
        } satisfies IHrmsTask.IRequest,
      },
    );
  typia.assert(statusAnalytics);
  // 3. Test priority grouping analytics
  const priorityAnalytics =
    await api.functional.hrms.member.projects.tasks.analytics(
      memberConnection,
      {
        body: {
          grouping: {
            group_by: "priority",
            include_subtasks: true,
            include_empty_groups: false,
          },
        } satisfies IHrmsTask.IRequest,
      },
    );
  typia.assert(priorityAnalytics);
  // 4. Validate analytics response structure
  TestValidator.equals(
    "status analytics has project_id",
    statusAnalytics.project_id !== undefined,
    true,
  );
  TestValidator.equals(
    "status analytics has project_name",
    statusAnalytics.project_name !== undefined,
    true,
  );
  TestValidator.equals(
    "status analytics has task_count",
    statusAnalytics.task_count !== undefined,
    true,
  );
  TestValidator.predicate(
    "priority analytics is not null",
    priorityAnalytics !== null && priorityAnalytics !== undefined,
  );
  TestValidator.equals(
    "priority analytics has project_id",
    priorityAnalytics.project_id !== undefined,
    true,
  );
  TestValidator.equals(
    "priority analytics has project_name",
    priorityAnalytics.project_name !== undefined,
    true,
  );
  TestValidator.equals(
    "priority analytics has task_count",
    priorityAnalytics.task_count !== undefined,
    true,
  );
}
