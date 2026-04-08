import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_time_tracking_timezone(
  input?: DeepPartial<IHrmPlatformTimeTrackingTimezone.ICreate> | undefined,
): IHrmPlatformTimeTrackingTimezone.ICreate {
  const timezoneOptions = [
    "Asia/Seoul",
    "America/New_York",
    "Europe/London",
    "America/Los_Angeles",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Australia/Sydney",
  ] as const;
  return {
    organization_id:
      input?.organization_id ?? typia.random<string & tags.Format<"uuid">>(),
    timezone: input?.timezone ?? RandomGenerator.pick(timezoneOptions),
  };
}
