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

export async function test_api_project_analytics_no_activity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph(),
        org_logo_uri: typia.random<string & tags.Format<"uri">>(),
        org_timezone: RandomGenerator.pick([
          "UTC",
          "Asia/Seoul",
          "America/New_York",
        ]),
        org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(authorized);
  // 2. Test analytics with a valid project UUID (project with no activity)
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const analytics: IProjectAnalytic =
    await api.functional.hrmPlatform.member.projects.analytics.at(
      memberConnection,
      {
        projectId,
      },
    );
  typia.assert(analytics);
  // 3. Validate all aggregate fields are 0 or null for no-activity project
  TestValidator.equals(
    "total duration is 0",
    analytics.total_duration_minutes,
    0,
  );
  TestValidator.equals(
    "billable duration is 0",
    analytics.billable_duration_minutes,
    0,
  );
  TestValidator.equals(
    "non-billable duration is 0",
    analytics.non_billable_duration_minutes,
    0,
  );
  TestValidator.equals("TODO count is 0", analytics.task_counts.TODO, 0);
  TestValidator.equals(
    "IN_PROGRESS count is 0",
    analytics.task_counts.IN_PROGRESS,
    0,
  );
  TestValidator.equals(
    "IN_REVIEW count is 0",
    analytics.task_counts.IN_REVIEW,
    0,
  );
  TestValidator.equals("DONE count is 0", analytics.task_counts.DONE, 0);
  TestValidator.equals(
    "budget utilization is null",
    analytics.budget_utilization,
    null,
  );
  TestValidator.equals(
    "member activity count is 0",
    analytics.member_activity_count,
    0,
  );
}
