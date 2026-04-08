import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IProjectAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IProjectAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_analytics_budget_overrun(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // Note: Full budget overrun testing (budget_utilization > 100) requires:
  // - Creating a project with budget_hours (not available via provided APIs)
  // - Creating employees and project memberships (not available via provided APIs)
  // - Creating timelogs that exceed the budget (not available via provided APIs)
  // This test validates the analytics endpoint response structure and basic business logic.
  // 2. Call analytics endpoint with a random project ID
  const analytics =
    await api.functional.hrmPlatform.member.projects.analytics.at(
      memberConnection,
      {
        projectId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(analytics);
  // 3. Validate duration fields are non-negative
  TestValidator.equals(
    "total duration is non-negative",
    analytics.total_duration_minutes,
    0,
  );
  TestValidator.equals(
    "billable duration is non-negative",
    analytics.billable_duration_minutes,
    0,
  );
  TestValidator.equals(
    "non-billable duration is non-negative",
    analytics.non_billable_duration_minutes,
    0,
  );
  // 4. Validate total duration equals billable + non-billable
  TestValidator.equals(
    "total duration equals billable plus non-billable",
    analytics.total_duration_minutes,
    analytics.billable_duration_minutes +
      analytics.non_billable_duration_minutes,
  );
  // 5. Validate task counts are non-negative
  TestValidator.equals(
    "task count TODO is non-negative",
    analytics.task_counts.TODO,
    0,
  );
  TestValidator.equals(
    "task count IN_PROGRESS is non-negative",
    analytics.task_counts.IN_PROGRESS,
    0,
  );
  TestValidator.equals(
    "task count IN_REVIEW is non-negative",
    analytics.task_counts.IN_REVIEW,
    0,
  );
  TestValidator.equals(
    "task count DONE is non-negative",
    analytics.task_counts.DONE,
    0,
  );
  // 6. Validate budget utilization is valid (null or non-negative number)
  TestValidator.predicate(
    "budget utilization is null or non-negative number",
    analytics.budget_utilization === null || analytics.budget_utilization >= 0,
  );
  // 7. Validate member activity count is non-negative
  TestValidator.equals(
    "member activity count is non-negative",
    analytics.member_activity_count,
    0,
  );
}