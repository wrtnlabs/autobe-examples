import { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemHealthMetricMetadatumTransformer } from "../transformers/DiscussionBoardSystemHealthMetricMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSystemHealthMetricsMetricIdMetadata(props: {
  admin: AdminPayload;
  metricId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemHealthMetricMetadatum.IUpdate;
}): Promise<IDiscussionBoardSystemHealthMetricMetadatum> {
  // Verify the system health metric exists
  await MyGlobal.prisma.discussion_board_system_health_metrics.findUniqueOrThrow(
    {
      where: { id: props.metricId },
    },
  );
  // Check if metadata record exists before updating
  const existingMetadata =
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
  if (!existingMetadata) {
    throw new HttpException("Metadata record not found", 404);
  }
  // Update the metadata record
  const now = new Date().toISOString();
  await MyGlobal.prisma.discussion_board_system_health_metric_metadata.update({
    where: {
      id: existingMetadata.id,
    },
    data: {
      value: props.body.value,
      updated_at: new Date(now),
    },
  });
  // Fetch the updated record
  const updatedMetadata =
    await MyGlobal.prisma.discussion_board_system_health_metric_metadata.findUniqueOrThrow(
      {
        where: { id: existingMetadata.id },
        ...DiscussionBoardSystemHealthMetricMetadatumTransformer.select(),
      },
    );
  return await DiscussionBoardSystemHealthMetricMetadatumTransformer.transform(
    updatedMetadata,
  );
}
