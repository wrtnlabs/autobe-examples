import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_timer } from "../prepare/prepare_random_hrm_platform_timer";

/**
 * Generate a random timer for tracking time on a project or task for E2E testing.
 *
 * Prepares random timer data using the prepare function, then calls the creation
 * endpoint to create a new timer with status set to 'started'. The timer can be
 * optionally associated with a project and/or task. The system validates that the
 * authenticated employee is active and has no other active timer.
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
