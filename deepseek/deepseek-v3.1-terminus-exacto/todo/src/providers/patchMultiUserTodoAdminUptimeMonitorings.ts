import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUptimeMonitoring";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUptimeMonitoring";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoUptimeMonitoringAtSummaryTransformer } from "../transformers/MultiUserTodoUptimeMonitoringAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAdminUptimeMonitorings(props: {
  admin: AdminPayload;
  body: IMultiUserTodoUptimeMonitoring.IRequest;
}): Promise<IPageIMultiUserTodoUptimeMonitoring.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions - convert string dates to Date objects for Prisma
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      service_name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.is_healthy !== undefined &&
      props.body.is_healthy !== null && {
        is_healthy: props.body.is_healthy,
      }),
    ...(props.body.date_from && {
      created_at: {
        gte: new Date(props.body.date_from),
      },
    }),
    ...(props.body.date_to && {
      created_at: {
        lte: new Date(props.body.date_to),
      },
    }),
  } satisfies Prisma.multi_user_todo_uptime_monitoringsWhereInput;
  // Execute queries sequentially to avoid performance issues
  const data =
    await MyGlobal.prisma.multi_user_todo_uptime_monitorings.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...MultiUserTodoUptimeMonitoringAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.multi_user_todo_uptime_monitorings.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoUptimeMonitoringAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
