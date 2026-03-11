import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoErrorLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoErrorLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoErrorLogAtSummaryTransformer } from "../transformers/MultiUserTodoErrorLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAdminErrorLogs(props: {
  admin: AdminPayload;
  body: IMultiUserTodoErrorLog.IRequest;
}): Promise<IPageIMultiUserTodoErrorLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereConstraints: Prisma.multi_user_todo_error_logsWhereInput[] = [];
  if (props.body.error_type !== undefined) {
    whereConstraints.push({ error_type: props.body.error_type });
  }
  if (props.body.severity !== undefined) {
    whereConstraints.push({ severity: props.body.severity });
  }
  if (props.body.service_name !== undefined) {
    whereConstraints.push({ service_name: props.body.service_name });
  }
  if (props.body.environment !== undefined) {
    whereConstraints.push({ environment: props.body.environment });
  }
  if (props.body.search !== undefined) {
    whereConstraints.push({
      error_message: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    });
  }
  if (props.body.occurred_at_from !== undefined) {
    whereConstraints.push({
      occurred_at: {
        gte: new Date(props.body.occurred_at_from),
      },
    });
  }
  if (props.body.occurred_at_to !== undefined) {
    whereConstraints.push({
      occurred_at: {
        lte: new Date(props.body.occurred_at_to),
      },
    });
  }
  if (props.body.resolved_at_from !== undefined) {
    whereConstraints.push({
      resolved_at: {
        gte: new Date(props.body.resolved_at_from),
      },
    });
  }
  if (props.body.resolved_at_to !== undefined) {
    whereConstraints.push({
      resolved_at: {
        lte: new Date(props.body.resolved_at_to),
      },
    });
  }
  const whereInput =
    whereConstraints.length > 0 ? { AND: whereConstraints } : {};
  const data = await MyGlobal.prisma.multi_user_todo_error_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { occurred_at: "desc" as const },
    ...MultiUserTodoErrorLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.multi_user_todo_error_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MultiUserTodoErrorLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
