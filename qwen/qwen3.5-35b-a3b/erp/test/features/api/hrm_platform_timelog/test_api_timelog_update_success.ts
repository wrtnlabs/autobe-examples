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

export async function test_api_timelog_update_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful timelog update by the authenticated member.
   *
   * Validates the timelog update endpoint functionality including proper request
   * structure validation and response field verification. The test registers
   * a member account, authenticates, and then updates a timelog entry with
   * modified timing details and billable status.
   *
   * 1. Member joins with email and organization creation.
   * 2. Member authenticates and obtains access tokens.
   * 3. Update timelog with new start/end datetimes and billable status.
   * 4. Validates response contains all expected fields with updated values.
   * 5. Confirms duration calculation is correct (4 hours = 240 minutes).
   * 6. Verifies timestamps are properly set.
   */
  // 1. Register member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
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
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test timelog update with generated UUID
  const updateStart = new Date();
  const updateEnd = new Date(updateStart.getTime() + 4 * 60 * 60 * 1000); // 4 hours later
  const updatedTimelog =
    await api.functional.hrmPlatform.member.timelogs.update(memberConnection, {
      timelogId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        start_datetime: updateStart.toISOString(),
        end_datetime: updateEnd.toISOString(),
        description: "Updated timelog entry with new details",
        billable: true,
      } satisfies IHrmPlatformTimelog.IUpdate,
    });
  typia.assert(updatedTimelog);
  // 3. Validate response contains required fields
  TestValidator.predicate(
    "project reference exists",
    updatedTimelog.project.id !== undefined &&
      updatedTimelog.project.id !== null,
  );
  TestValidator.predicate(
    "employee reference exists",
    updatedTimelog.employee.id !== undefined &&
      updatedTimelog.employee.id !== null,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    "Updated timelog entry with new details",
  );
  TestValidator.equals("billable changed", updatedTimelog.billable, true);
  TestValidator.equals(
    "start_datetime updated",
    updatedTimelog.start_datetime,
    updateStart.toISOString(),
  );
  TestValidator.equals(
    "end_datetime updated",
    updatedTimelog.end_datetime,
    updateEnd.toISOString(),
  );
  TestValidator.equals(
    "duration recalculated",
    updatedTimelog.duration_minutes,
    240,
  );
  // 4. Validate timestamps
  TestValidator.notEquals(
    "updated_at changed from created_at",
    updatedTimelog.created_at,
    updatedTimelog.updated_at,
  );
  TestValidator.predicate(
    "updated_at is recent",
    new Date(updatedTimelog.updated_at) > updateStart,
  );
}
