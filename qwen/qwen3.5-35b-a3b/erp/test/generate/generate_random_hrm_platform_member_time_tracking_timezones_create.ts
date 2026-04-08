import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_time_tracking_timezone } from "../prepare/prepare_random_hrm_platform_time_tracking_timezone";

/**
 * Generate a random timezone configuration for an organization via the API for E2E testing.
 *
 * Prepares random timezone data using the prepare function, then calls the creation endpoint
 * to create a timezone setting that applies to all time tracking operations within the
 * organization. The organization identifier must exist and be unique per timezone configuration.
 */
export async function generate_random_hrm_platform_member_time_tracking_timezones_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformTimeTrackingTimezone.ICreate> | undefined;
  },
): Promise<IHrmPlatformTimeTrackingTimezone> {
  const prepared: IHrmPlatformTimeTrackingTimezone.ICreate =
    prepare_random_hrm_platform_time_tracking_timezone(props.body);
  const result: IHrmPlatformTimeTrackingTimezone =
    await api.functional.hrmPlatform.member.time_tracking_timezones.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
