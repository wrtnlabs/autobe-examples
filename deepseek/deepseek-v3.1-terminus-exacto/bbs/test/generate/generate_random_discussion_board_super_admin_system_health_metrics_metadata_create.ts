import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_system_health_metric_metadatum } from "../prepare/prepare_random_discussion_board_system_health_metric_metadatum";

export async function generate_random_discussion_board_super_admin_system_health_metrics_metadata_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSystemHealthMetricMetadatum.ICreate>;
    params: {
      metricId: string;
    };
  },
): Promise<IDiscussionBoardSystemHealthMetricMetadatum> {
  const prepared: IDiscussionBoardSystemHealthMetricMetadatum.ICreate =
    prepare_random_discussion_board_system_health_metric_metadatum(props.body);
  const result: IDiscussionBoardSystemHealthMetricMetadatum =
    await api.functional.discussionBoard.superAdmin.system_health_metrics.metadata.create(
      connection,
      {
        metricId: props.params.metricId,
        body: prepared,
      },
    );
  return result;
}
