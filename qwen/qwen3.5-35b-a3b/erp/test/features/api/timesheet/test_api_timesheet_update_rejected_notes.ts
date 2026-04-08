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

export async function test_api_timesheet_update_rejected_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join (creates account + org automatically)
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: "KRW",
        org_description: RandomGenerator.paragraph({ sentences: 1 }),
        org_timezone: "Asia/Seoul",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create timesheet with initial notes
  const timesheet: IHrmPlatformTimesheet =
    await api.functional.hrmPlatform.member.timesheets.create(
      memberConnection,
      {
        body: {
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 6 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          hrm_platform_employee_id: member.member.id,
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  // 3. Verify initial state
  const initialNotes: string | null = timesheet.notes;
  const initialStatus: string = timesheet.status;
  const initialUpdatedAt: string = timesheet.updated_at;
  const initialTimelogCount: number = timesheet.timelogs.length;
  // 4. Update timesheet notes (simulating employee response to manager feedback)
  const newNotes: string = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTimesheet: IHrmPlatformTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          notes: newNotes,
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  // 5. Validate notes were successfully updated
  TestValidator.equals("notes updated", updatedTimesheet.notes, newNotes);
  TestValidator.equals(
    "initial notes differ",
    updatedTimesheet.notes,
    initialNotes,
  );
  // 6. Validate status remained unchanged (rejected/pending preserved)
  TestValidator.equals(
    "status unchanged",
    updatedTimesheet.status,
    initialStatus,
  );
  TestValidator.predicate(
    "status modifiable",
    updatedTimesheet.status === "pending" ||
      updatedTimesheet.status === "rejected",
  );
  // 7. Validate updated_at timestamp was modified
  TestValidator.notEquals(
    "updated_at modified",
    updatedTimesheet.updated_at,
    initialUpdatedAt,
  );
  // 8. Validate timelogs remain unchanged
  TestValidator.equals(
    "timelogs count unchanged",
    updatedTimesheet.timelogs.length,
    initialTimelogCount,
  );
  // 9. Validate full entity returned with required fields
  TestValidator.predicate(
    "has employee",
    updatedTimesheet.employee !== undefined,
  );
  TestValidator.predicate(
    "has timelogs array",
    Array.isArray(updatedTimesheet.timelogs),
  );
  TestValidator.predicate(
    "has timestamps",
    updatedTimesheet.created_at !== undefined &&
      updatedTimesheet.updated_at !== undefined,
  );
}
