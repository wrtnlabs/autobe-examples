import { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSystemHealthMetricMetadatumCollector } from "../collectors/DiscussionBoardSystemHealthMetricMetadatumCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemHealthMetricMetadatumTransformer } from "../transformers/DiscussionBoardSystemHealthMetricMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSystemHealthMetricsMetricIdMetadata(props: {
  admin: AdminPayload;
  metricId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemHealthMetricMetadatum.ICreate;
}): Promise<IDiscussionBoardSystemHealthMetricMetadatum> {
  // 1. Verify parent metric exists and is not deleted
  const parentMetric =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findUnique({
      where: {
        id: props.metricId,
        deleted_at: null,
      },
    });
  if (!parentMetric) {
    throw new HttpException("System health metric not found", 404);
  }
  // 2. Check for existing metadata with same key for this metric (enforce uniqueness)
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
  if (existingMetadata) {
    throw new HttpException(
      `Metadata key '${props.body.key}' already exists for this metric`,
      409,
    );
  }
  // 3. Prepare parent metric entity for collector
  const discussionBoardSystemHealthMetrics: IEntity = {
    id: parentMetric.id,
  };
  // 4. Create metadata using collector + transformer
  const created =
    await MyGlobal.prisma.discussion_board_system_health_metric_metadata.create(
      {
        data: await DiscussionBoardSystemHealthMetricMetadatumCollector.collect(
          {
            body: props.body,
            discussionBoardSystemHealthMetrics,
          },
        ),
        ...DiscussionBoardSystemHealthMetricMetadatumTransformer.select(),
      },
    );
  // 5. Transform and return
  return await DiscussionBoardSystemHealthMetricMetadatumTransformer.transform(
    created,
  );
}
