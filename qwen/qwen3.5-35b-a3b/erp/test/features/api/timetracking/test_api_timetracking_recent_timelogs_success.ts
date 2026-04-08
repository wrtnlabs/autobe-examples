import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of recent timelogs by an authenticated member.
 *
 * Validates the primary success path for the recent timelogs endpoint. The test registers a new member account to establish authentication context, then calls the GET endpoint to retrieve recent timelogs. It verifies that authentication is properly enforced, response structure matches the IHrmPlatformTimelog DTO, and all required fields are present with correct types.
 *
 * Due to SDK limitations (no employee or timelog creation APIs available), this test focuses on API contract validation: authentication flow, response structure, field presence, and type correctness. The test does not validate timelog count or content since test data cannot be created within the available API surface.
 */
export async function test_api_timetracking_recent_timelogs_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain authentication tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
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
  typia.assert(joined);
  // 2. Call the recent-timelogs endpoint with valid authentication
  // The joinConnection.headers are updated by authorize_member_join with the token
  const recentTimelogs =
    await api.functional.hrmPlatform.member.timetracking.recent_timelogs.recent(
      joinConnection,
    );
  typia.assert(recentTimelogs);
  // 3. Validate timelog structure and required fields
  // Validate employee reference matches authenticated member
  TestValidator.equals(
    "timelog employee matches authenticated member",
    recentTimelogs.employee.id,
    joined.member.id,
  );
  // Validate employee has required fields
  TestValidator.notEquals(
    "employee has valid id",
    recentTimelogs.employee.id,
    null,
  );
  TestValidator.notEquals(
    "employee has email",
    recentTimelogs.employee.email,
    null,
  );
  // Validate project reference exists
  TestValidator.notEquals(
    "project reference exists",
    recentTimelogs.project.id,
    null,
  );
  TestValidator.notEquals(
    "project has name",
    recentTimelogs.project.name,
    null,
  );
  // Validate timestamps are valid date-time strings
  TestValidator.predicate(
    "start_datetime is valid date-time",
    () => !isNaN(Date.parse(recentTimelogs.start_datetime)),
  );
  TestValidator.predicate(
    "end_datetime is valid date-time",
    () => !isNaN(Date.parse(recentTimelogs.end_datetime)),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(recentTimelogs.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(recentTimelogs.updated_at)),
  );
  // Validate duration is positive
  TestValidator.predicate(
    "duration_minutes is positive",
    () => recentTimelogs.duration_minutes > 0,
  );
  // Validate deleted_at is null for active timelogs
  TestValidator.equals(
    "deleted_at is null for active timelog",
    recentTimelogs.deleted_at,
    null,
  );
  // Validate billable flag exists
  TestValidator.notEquals(
    "billable flag exists",
    recentTimelogs.billable,
    null,
  );
}
