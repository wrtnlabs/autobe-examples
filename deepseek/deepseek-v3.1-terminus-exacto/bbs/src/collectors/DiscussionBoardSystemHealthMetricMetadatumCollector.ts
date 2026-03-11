import { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSystemHealthMetricMetadatumCollector {
  export async function collect(props: {
    body: IDiscussionBoardSystemHealthMetricMetadatum.ICreate;
    discussionBoardSystemHealthMetrics: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      key: props.body.key,
      value: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
      metric: { connect: { id: props.discussionBoardSystemHealthMetrics.id } },
    } satisfies Prisma.discussion_board_system_health_metric_metadataCreateInput;
  }
}
