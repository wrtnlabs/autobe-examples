import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoPerformanceMetric";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoPerformanceMetricTransformer } from "../transformers/MultiUserTodoPerformanceMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoAdminPerformanceMetricsMetricId(props: {
  admin: AdminPayload;
  metricId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoPerformanceMetric> {
  const metric =
    await MyGlobal.prisma.multi_user_todo_performance_metrics.findUniqueOrThrow(
      {
        where: { id: props.metricId },
        ...MultiUserTodoPerformanceMetricTransformer.select(),
      },
    );
  return await MultiUserTodoPerformanceMetricTransformer.transform(metric);
}
