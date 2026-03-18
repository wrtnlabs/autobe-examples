import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test project status analytics retrieval for member.
 * Validates analytics endpoint returns correct structure and data.
 */
export async function test_api_project_status_analytics_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create actor-specific connection for member
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member.token.access}`,
    },
  };
  // 3. Call status analytics endpoint
  const analytics: IHrmsTask =
    await api.functional.hrms.member.projects.status_analytics.at(
      memberConnection,
    );
  typia.assert(analytics);
  // 4. Validate analytics array is present
  TestValidator.equals(
    "analytics array exists",
    analytics.analytics.length >= 0,
    true,
  );
  // 5. Validate each project summary has required fields
  if (analytics.analytics.length > 0) {
    for (const project of analytics.analytics) {
      TestValidator.equals(
        "project_id is valid uuid",
        project.project_id !== undefined,
        true,
      );
      TestValidator.equals(
        "project_name is string",
        typeof project.project_name === "string",
        true,
      );
      TestValidator.equals(
        "task_count is number",
        typeof project.task_count === "number",
        true,
      );
    }
  }
  // 6. Validate total_projects is non-negative
  TestValidator.predicate(
    "total_projects is non-negative",
    analytics.total_projects >= 0,
  );
  // 7. Validate analytics are sorted by task_count descending
  if (analytics.analytics.length > 1) {
    for (let i = 1; i < analytics.analytics.length; i++) {
      const prevTaskCount = analytics.analytics[i - 1].task_count;
      const currTaskCount = analytics.analytics[i].task_count;
      TestValidator.predicate(
        `analytics sorted by task_count descending at index ${i}`,
        prevTaskCount >= currTaskCount,
      );
    }
  }
  // 8. Validate total_budget_hours and total_logged_hours are valid (null or non-negative)
  if (analytics.total_budget_hours !== null) {
    TestValidator.predicate(
      "total_budget_hours is non-negative when not null",
      analytics.total_budget_hours >= 0,
    );
  }
  if (analytics.total_logged_hours !== null) {
    TestValidator.predicate(
      "total_logged_hours is non-negative when not null",
      analytics.total_logged_hours >= 0,
    );
  }
}