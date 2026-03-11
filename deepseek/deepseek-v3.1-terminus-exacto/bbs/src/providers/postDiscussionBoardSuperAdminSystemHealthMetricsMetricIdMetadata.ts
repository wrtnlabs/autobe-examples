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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemHealthMetricMetadatumTransformer } from "../transformers/DiscussionBoardSystemHealthMetricMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSystemHealthMetricsMetricIdMetadata(props: {
  superAdmin: SuperadminPayload;
  metricId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemHealthMetricMetadatum.ICreate;
}): Promise<IDiscussionBoardSystemHealthMetricMetadatum> {
  // 1. Validate parent metric exists and is not deleted
  const metric =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findUniqueOrThrow(
      {
        where: { id: props.metricId, deleted_at: null },
      },
    );
  // 2. Check for duplicate (metricId, key) combination
  const existing =
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
  if (existing) {
    throw new HttpException("Metadata key already exists for this metric", 409);
  }
  // 3. Create metadata record using collector
  const created =
    await MyGlobal.prisma.discussion_board_system_health_metric_metadata.create(
      {
        data: await DiscussionBoardSystemHealthMetricMetadatumCollector.collect(
          {
            body: props.body,
            discussionBoardSystemHealthMetrics: {
              id: props.metricId,
            } satisfies IEntity,
          },
        ),
        ...DiscussionBoardSystemHealthMetricMetadatumTransformer.select(),
      },
    );
  // 4. Transform and return
  return await DiscussionBoardSystemHealthMetricMetadatumTransformer.transform(
    created,
  );
}
