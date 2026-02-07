import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_usage_metric } from "../prepare/prepare_random_community_usage_metric";

export async function generate_random_community_admin_usage_metrics_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityUsageMetric.ICreate> | undefined;
  },
): Promise<ICommunityUsageMetric> {
  const prepared: ICommunityUsageMetric.ICreate =
    prepare_random_community_usage_metric(props.body);
  return await api.functional.community.admin.usage_metrics.create(connection, {
    body: prepared,
  });
}
