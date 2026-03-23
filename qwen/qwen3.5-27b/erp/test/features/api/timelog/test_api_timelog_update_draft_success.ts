import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the primary success path for updating a timelog record.
 * Admin updates timelog duration, task assignment, billable status, and description.
 * Verifies all fields are updated correctly and date remains immutable.
 */
export async function test_api_timelog_update_draft_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Setup member connection (employee who owns the timelog)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      href: "https://test.com/member/join",
      referrer: "https://test.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 3. Create initial timelog with member connection
  const initialTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          duration: 60,
          billable: true,
          description: "Initial work description",
        },
      },
    );
  typia.assert(initialTimelog);
  // 4. Update timelog with admin connection
  const updatedTimelog = await api.functional.hrmPlatform.admin.timelogs.update(
    adminConnection,
    {
      timelogId: initialTimelog.id,
      body: {
        duration: 90,
        billable: false,
        description: "Updated work description after modification",
        hrm_platform_task_id: initialTimelog.task?.id ?? null,
      } satisfies IHrmPlatformTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimelog);
  // 5. Verify updated fields match expectations
  TestValidator.equals("duration updated to 90", updatedTimelog.duration, 90);
  TestValidator.equals(
    "billable status changed to false",
    updatedTimelog.billable,
    false,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    "Updated work description after modification",
  );
  TestValidator.equals(
    "date remains unchanged (immutable)",
    updatedTimelog.date,
    initialTimelog.date,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedTimelog.updated_at) > new Date(updatedTimelog.created_at),
  );
  TestValidator.equals(
    "timelog id preserved",
    updatedTimelog.id,
    initialTimelog.id,
  );
}
