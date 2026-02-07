import { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_system_metric(
  input?: DeepPartial<ICommunityPlatformSystemMetric.ICreate> | undefined,
): ICommunityPlatformSystemMetric.ICreate {
  return {
    metric_type:
      input?.metric_type ??
      RandomGenerator.pick([
        "response_time",
        "uptime",
        "cpu_usage",
        "memory_usage",
        "disk_usage",
        "request_count",
      ] as const),
    value: input?.value ?? typia.random<number & tags.ExclusiveMinimum<0>>(),
    timestamp:
      input?.timestamp ??
      RandomGenerator.date(
        new Date(Date.now() - 86400000),
        86400000,
      ).toISOString(),
  };
}
