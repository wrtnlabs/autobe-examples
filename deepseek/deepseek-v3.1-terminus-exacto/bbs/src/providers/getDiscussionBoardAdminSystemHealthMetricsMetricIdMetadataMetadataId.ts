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

export async function getDiscussionBoardAdminSystemHealthMetricsMetricIdMetadataMetadataId(props: {
  admin: AdminPayload;
  metricId: string & tags.Format<"uuid">;
  metadataId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemHealthMetricMetadatum> {
  const metadata =
    await MyGlobal.prisma.discussion_board_system_health_metric_metadata.findUniqueOrThrow(
      {
        where: {
          id: props.metadataId,
          system_health_metric_id: props.metricId,
        },
        ...DiscussionBoardSystemHealthMetricMetadatumTransformer.select(),
      },
    );
  return await DiscussionBoardSystemHealthMetricMetadatumTransformer.transform(
    metadata,
  );
}
