import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminSystemHealthMetricsMetricIdMetadataMetadataId(props: {
  superAdmin: SuperadminPayload;
  metricId: string & tags.Format<"uuid">;
  metadataId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the metric exists
  await MyGlobal.prisma.discussion_board_system_health_metrics.findFirstOrThrow(
    {
      where: {
        id: props.metricId,
        deleted_at: null,
      },
    },
  );
  // Verify metadata exists and belongs to the specified metric
  const metadata =
    await MyGlobal.prisma.discussion_board_system_health_metric_metadata.findFirstOrThrow(
      {
        where: {
          id: props.metadataId,
          system_health_metric_id: props.metricId,
        },
        select: {
          id: true,
          system_health_metric_id: true,
        },
      },
    );
  // Perform deletion
  await MyGlobal.prisma.discussion_board_system_health_metric_metadata.delete({
    where: { id: props.metadataId },
  });
}
