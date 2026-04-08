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

export async function test_api_timesheet_creation_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with initial organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinOutput);
  // 2. Set up connection with authorization token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinOutput.token.access },
  };
  // 3. Create week period (Monday to Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  // 4. Create timesheet with detailed notes
  const timesheetWithNotes =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          start_date: monday.toISOString(),
          end_date: sunday.toISOString(),
          hrm_platform_employee_id: joinOutput.member.id,
          notes: "Completed Q1 development milestones and client deliverables",
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheetWithNotes);
  // 5. Validate notes are stored correctly
  TestValidator.equals(
    "notes match input",
    timesheetWithNotes.notes,
    "Completed Q1 development milestones and client deliverables",
  );
  TestValidator.equals(
    "timesheet status",
    timesheetWithNotes.status,
    "pending",
  );
  // 6. Test with null notes
  const timesheetNullNotes =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          start_date: monday.toISOString(),
          end_date: sunday.toISOString(),
          hrm_platform_employee_id: joinOutput.member.id,
          notes: null,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheetNullNotes);
  TestValidator.equals("null notes preserved", timesheetNullNotes.notes, null);
  // 7. Test with short note
  const shortNote = "Test";
  const timesheetShortNote =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          start_date: monday.toISOString(),
          end_date: sunday.toISOString(),
          hrm_platform_employee_id: joinOutput.member.id,
          notes: shortNote,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheetShortNote);
  TestValidator.equals(
    "short notes preserved",
    timesheetShortNote.notes,
    shortNote,
  );
  // 8. Test with long paragraph note
  const longNote = RandomGenerator.content({ paragraphs: 3 });
  const timesheetLongNote =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          start_date: monday.toISOString(),
          end_date: sunday.toISOString(),
          hrm_platform_employee_id: joinOutput.member.id,
          notes: longNote,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheetLongNote);
  TestValidator.equals(
    "long notes preserved",
    timesheetLongNote.notes,
    longNote,
  );
  // 9. Test with notes containing special characters
  const specialCharNote =
    "Meeting: 10:00-11:30 | Budget: $50,000 | Priority: HIGH";
  const timesheetSpecialNote =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          start_date: monday.toISOString(),
          end_date: sunday.toISOString(),
          hrm_platform_employee_id: joinOutput.member.id,
          notes: specialCharNote,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheetSpecialNote);
  TestValidator.equals(
    "special char notes preserved",
    timesheetSpecialNote.notes,
    specialCharNote,
  );
}
