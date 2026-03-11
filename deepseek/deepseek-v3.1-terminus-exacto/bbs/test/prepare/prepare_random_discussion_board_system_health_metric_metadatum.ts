import { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_system_health_metric_metadatum(
  input?: DeepPartial<IDiscussionBoardSystemHealthMetricMetadatum.ICreate>,
): IDiscussionBoardSystemHealthMetricMetadatum.ICreate {
  return {
    key:
      input?.key ?? RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
    value: input?.value ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
