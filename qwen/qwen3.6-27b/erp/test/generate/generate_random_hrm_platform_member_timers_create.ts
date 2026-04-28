import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_timer } from "../prepare/prepare_random_hrm_platform_timer";

/**
 * Generate a random HRM platform timer via the API for E2E testing.
 *
 * Prepares random timer creation data using the prepare function, then calls the creation endpoint.
 * The timer is associated with the authenticated member's active employee within the current
 * organization context. It tracks time against the specified project and optional task.
 * Each employee can only have one active timer at a time.
 *
 * @param connection - The API connection instance.
 * @param props - Optional partial properties for the timer creation request.
 * @returns The created timer entity.
 */
export async function generate_random_hrm_platform_member_timers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformTimer.ICreate> | undefined;
  },
): Promise<IHrmPlatformTimer> {
  const prepared: IHrmPlatformTimer.ICreate = prepare_random_hrm_platform_timer(
    props.body,
  );
  const result: IHrmPlatformTimer =
    await api.functional.hrmPlatform.member.timers.create(connection, {
      body: prepared,
    });
  return result;
}
