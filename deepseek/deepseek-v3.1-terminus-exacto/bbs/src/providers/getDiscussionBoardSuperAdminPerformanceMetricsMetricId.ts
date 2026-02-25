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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardPerformanceMetricTransformer } from "../transformers/DiscussionBoardPerformanceMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getDiscussionBoardSuperAdminPerformanceMetricsMetricId(props: {
  superAdmin: SuperAdminPayload;
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
