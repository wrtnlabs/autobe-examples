import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_system_metric } from "../prepare/prepare_random_community_platform_system_metric";

export async function generate_random_community_platform_admin_system_metrics_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSystemMetric.ICreate> | undefined;
  },
): Promise<ICommunityPlatformSystemMetric> {
  const prepared: ICommunityPlatformSystemMetric.ICreate =
    prepare_random_community_platform_system_metric(props.body);
  return await api.functional.communityPlatform.admin.system.metrics.create(
    connection,
    {
      body: prepared,
    },
  );
}
