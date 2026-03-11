import { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemHealthMetricMetadatumTransformer } from "../transformers/DiscussionBoardSystemHealthMetricMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSystemHealthMetricsMetricIdMetadata(props: {
  superAdmin: SuperadminPayload;
  metricId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemHealthMetricMetadatum.IUpdate;
}): Promise<IDiscussionBoardSystemHealthMetricMetadatum> {
  // First verify parent metric exists
  await MyGlobal.prisma.discussion_board_system_health_metrics.findUniqueOrThrow(
    {
      where: { id: props.metricId, deleted_at: null },
    },
  );
  // Update metadata where unique constraint matches
  const updated =
    await MyGlobal.prisma.discussion_board_system_health_metric_metadata.update(
      {
        where: {
          system_health_metric_id_key: {
            system_health_metric_id: props.metricId,
            key: props.body.key,
          },
        },
        data: {
          value: props.body.value,
          updated_at: new Date(),
        },
        ...DiscussionBoardSystemHealthMetricMetadatumTransformer.select(),
      },
    );
  return await DiscussionBoardSystemHealthMetricMetadatumTransformer.transform(
    updated,
  );
}
