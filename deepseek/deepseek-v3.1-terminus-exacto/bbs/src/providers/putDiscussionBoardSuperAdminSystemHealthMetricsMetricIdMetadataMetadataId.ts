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

export async function putDiscussionBoardSuperAdminSystemHealthMetricsMetricIdMetadataMetadataId(props: {
  superAdmin: SuperadminPayload;
  metricId: string & tags.Format<"uuid">;
  metadataId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemHealthMetricMetadatum.IUpdate;
}): Promise<IDiscussionBoardSystemHealthMetricMetadatum> {
  // Verify parent metric exists
  await MyGlobal.prisma.discussion_board_system_health_metrics.findUniqueOrThrow(
    {
      where: { id: props.metricId },
    },
  );
  // Verify metadata exists and belongs to parent metric
  const existing =
    await MyGlobal.prisma.discussion_board_system_health_metric_metadata.findUniqueOrThrow(
      {
        where: {
          id: props.metadataId,
          system_health_metric_id: props.metricId,
        },
        select: { id: true, key: true },
      },
    );
  // If key is being changed, verify uniqueness within parent metric
  if (existing.key !== props.body.key) {
    const conflict =
      await MyGlobal.prisma.discussion_board_system_health_metric_metadata.findUnique(
        {
          where: {
            system_health_metric_id_key: {
              system_health_metric_id: props.metricId,
              key: props.body.key,
            },
          },
        },
      );
    if (conflict) {
      throw new HttpException(
        `Metadata key '${props.body.key}' already exists for this metric`,
        409,
      );
    }
  }
  // Update metadata
  await MyGlobal.prisma.discussion_board_system_health_metric_metadata.update({
    where: { id: props.metadataId },
    data: {
      key: props.body.key,
      value: props.body.value,
      updated_at: new Date(),
    },
  });
  // Fetch updated record with transformer select
  const updated =
    await MyGlobal.prisma.discussion_board_system_health_metric_metadata.findUniqueOrThrow(
      {
        where: { id: props.metadataId },
        ...DiscussionBoardSystemHealthMetricMetadatumTransformer.select(),
      },
    );
  // Transform and return
  return await DiscussionBoardSystemHealthMetricMetadatumTransformer.transform(
    updated,
  );
}
