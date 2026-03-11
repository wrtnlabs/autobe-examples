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

export async function putDiscussionBoardAdminSystemHealthMetricsMetricIdMetadataMetadataId(props: {
  admin: AdminPayload;
  metricId: string & tags.Format<"uuid">;
  metadataId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemHealthMetricMetadatum.IUpdate;
}): Promise<IDiscussionBoardSystemHealthMetricMetadatum> {
  // 1. Verify parent metric exists
  await MyGlobal.prisma.discussion_board_system_health_metrics.findUniqueOrThrow(
    {
      where: { id: props.metricId },
    },
  );
  // 2. Update metadata with new key and value, ensuring it belongs to the parent metric
  await MyGlobal.prisma.discussion_board_system_health_metric_metadata.update({
    where: {
      id: props.metadataId,
      system_health_metric_id: props.metricId,
    },
    data: {
      key: props.body.key,
      value: props.body.value,
      updated_at: new Date(),
    },
  });
  // 3. Fetch updated record using transformer select
  const updated =
    await MyGlobal.prisma.discussion_board_system_health_metric_metadata.findUniqueOrThrow(
      {
        where: { id: props.metadataId },
        ...DiscussionBoardSystemHealthMetricMetadatumTransformer.select(),
      },
    );
  // 4. Transform and return
  return await DiscussionBoardSystemHealthMetricMetadatumTransformer.transform(
    updated,
  );
}
