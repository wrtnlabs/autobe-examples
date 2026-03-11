import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminSystemHealthMetricsMetricIdMetadataMetadataId(props: {
  admin: AdminPayload;
  metricId: string & tags.Format<"uuid">;
  metadataId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Delete the metadata record, ensuring it belongs to the specified metric
  // The delete operation will throw if no record matches both id AND system_health_metric_id
  await MyGlobal.prisma.discussion_board_system_health_metric_metadata.delete({
    where: {
      id: props.metadataId,
      system_health_metric_id: props.metricId,
    },
  });
}
