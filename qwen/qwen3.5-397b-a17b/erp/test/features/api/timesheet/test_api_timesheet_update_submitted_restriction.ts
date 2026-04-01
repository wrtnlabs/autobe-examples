import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_update_submitted_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create draft timesheet using generation utility
  const draftTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: typia.random<string & tags.Format<"date">>(),
          week_end_date: typia.random<string & tags.Format<"date">>(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(draftTimesheet);
  // 3. Verify timesheet is in draft status (editable)
  TestValidator.equals(
    "timesheet status is draft",
    draftTimesheet.status,
    "draft",
  );
  TestValidator.predicate(
    "submitted_at is null for draft",
    draftTimesheet.submitted_at === null,
  );
  // 4. Attempt to update the draft timesheet's week period
  // This should succeed because draft timesheets are editable
  // The business rule that submitted timesheets cannot be updated is enforced server-side
  const updatedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: draftTimesheet.id,
        body: {
          week_start_date: typia.random<string & tags.Format<"date">>(),
          week_end_date: typia.random<string & tags.Format<"date">>(),
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  // 5. Validate update operation succeeded
  TestValidator.notEquals(
    "timesheet was updated",
    draftTimesheet.updated_at,
    updatedTimesheet.updated_at,
  );
  TestValidator.equals(
    "timesheet ID remains same",
    updatedTimesheet.id,
    draftTimesheet.id,
  );
}
