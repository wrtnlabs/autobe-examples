import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate random unique email for registration
  const uniqueEmail = `test_${RandomGenerator.alphaNumeric(12)}@example.com`;
  // Generate password meeting minimum 8 character requirement
  const password = RandomGenerator.alphaNumeric(12);
  // Generate display name
  const displayName = RandomGenerator.name();
  // Prepare registration body
  const body: IErpHrmMember.IJoin = {
    email: uniqueEmail as string & tags.Format<"email">,
    password: password as string & tags.Format<"password">,
    displayName: displayName,
    href: "https://example.com/register" as string & tags.Format<"uri">,
    referrer: "https://example.com" as string & tags.Format<"uri">,
  };
  // Call member join endpoint
  const result = await api.functional.erpHrm.auth.member.join(connection, {
    body,
  });
  // Validate response structure
  typia.assert(result);
  // Validate token properties exist and are non-empty
  TestValidator.predicate(
    "access token exists",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.token.refreshable_until),
  );
  // Validate member profile matches input
  TestValidator.equals("email matches input", result.email, uniqueEmail);
  TestValidator.equals(
    "display_name matches input",
    result.display_name,
    displayName,
  );
  TestValidator.predicate(
    "member id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );
  // Validate dashboard data is empty for new user
  TestValidator.equals("activeTimers is empty array", result.activeTimers, []);
  TestValidator.equals(
    "projectSummary active is 0",
    result.projectSummary.active,
    0,
  );
  TestValidator.equals(
    "projectSummary archived is 0",
    result.projectSummary.archived,
    0,
  );
  TestValidator.equals(
    "projectSummary completed is 0",
    result.projectSummary.completed,
    0,
  );
  TestValidator.equals(
    "taskOverview byPriority.high is 0",
    result.taskOverview.byPriority.high,
    0,
  );
  TestValidator.equals(
    "taskOverview byPriority.low is 0",
    result.taskOverview.byPriority.low,
    0,
  );
  TestValidator.equals(
    "taskOverview byPriority.medium is 0",
    result.taskOverview.byPriority.medium,
    0,
  );
  TestValidator.equals(
    "taskOverview byPriority.urgent is 0",
    result.taskOverview.byPriority.urgent,
    0,
  );
  TestValidator.equals(
    "taskOverview byStatus.closed is 0",
    result.taskOverview.byStatus.closed,
    0,
  );
  TestValidator.equals(
    "taskOverview byStatus.completed is 0",
    result.taskOverview.byStatus.completed,
    0,
  );
  TestValidator.equals(
    "taskOverview byStatus.inProgress is 0",
    result.taskOverview.byStatus.inProgress,
    0,
  );
  TestValidator.equals(
    "taskOverview byStatus.open is 0",
    result.taskOverview.byStatus.open,
    0,
  );
  TestValidator.equals(
    "recentActivity timelogsCount is 0",
    result.recentActivity.timelogsCount,
    0,
  );
  TestValidator.equals(
    "recentActivity totalHoursThisWeek is 0",
    result.recentActivity.totalHoursThisWeek,
    0,
  );
}
