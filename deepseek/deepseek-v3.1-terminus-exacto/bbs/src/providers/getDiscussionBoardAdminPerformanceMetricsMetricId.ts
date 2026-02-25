import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardPerformanceMetricTransformer } from "../transformers/DiscussionBoardPerformanceMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminPerformanceMetricsMetricId(props: {
  admin: AdminPayload;
  metricId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardPerformanceMetric> {
  const metric =
    await MyGlobal.prisma.discussion_board_performance_metrics.findUniqueOrThrow(
      {
        where: { id: props.metricId },
        ...DiscussionBoardPerformanceMetricTransformer.select(),
      },
    );
  return await DiscussionBoardPerformanceMetricTransformer.transform(metric);
}
