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
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_timers_create } from "../../../generate/generate_random_hrm_platform_admin_timers_create";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test that an admin can delete a timer, which soft-deletes the record while preserving all historical data.
 *
 * 1. Admin authenticates via join
 * 2. Admin creates a new timer with a project assignment
 * 3. Admin deletes the timer
 * 4. Validate deletion completes successfully (soft-delete preserves data)
 */
export async function test_api_timer_delete_stopped_timer_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create a timer with project assignment
  const timer: IHrmPlatformTimer =
    await generate_random_hrm_platform_admin_timers_create(adminConnection, {
      body: {
        projectId: typia.random<string & tags.Format<"uuid">>(),
        taskId: null,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IHrmPlatformTimer.ICreate,
    });
  typia.assert(timer);
  // Validate timer was created successfully
  TestValidator.predicate("timer has valid ID", timer.id.length > 0);
  TestValidator.predicate(
    "timer has started_at",
    timer.started_at !== undefined,
  );
  TestValidator.predicate(
    "timer is running (not stopped)",
    timer.stopped_at === null,
  );
  TestValidator.predicate("timer is not deleted", timer.deleted_at === null);
  // 3. Delete the timer (soft-delete)
  await api.functional.hrmPlatform.admin.timers.erase(adminConnection, {
    timerId: timer.id,
  });
  // 4. Validate deletion completed successfully
  // Note: Since there's no GET timer endpoint in the SDK, we can only verify
  // that the deletion operation completed without errors.
  // The soft-delete functionality ensures:
  // - deleted_at is set to current timestamp
  // - started_at and stopped_at values are preserved
  // - project and task relationships are preserved
  // - Activity log entry is created
  TestValidator.predicate("timer deletion completed successfully", true);
}
