import { IEcommerceMallIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallIntegrationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallIntegrationLog";
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

export async function patchEcommerceMallAdminIntegrationLogs(props: {
  admin: AdminPayload;
  body: IEcommerceMallIntegrationLog.IRequest;
}): Promise<IPageIEcommerceMallIntegrationLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_integration_logsWhereInput = {
    ...(props.body.integration_type && {
      integration_type: props.body.integration_type,
    }),
    ...(props.body.request_date && {
      created_at: { gte: new Date(props.body.request_date) },
    }),
    ...(props.body.error_message !== null &&
      props.body.error_message !== undefined && {
        error_message: { contains: props.body.error_message },
      }),
    ...(props.body.duration_ms_min !== undefined && {
      duration_ms: { gte: props.body.duration_ms_min },
    }),
    ...(props.body.duration_ms_max !== undefined && {
      duration_ms: { lte: props.body.duration_ms_max },
    }),
  };
  const data = await MyGlobal.prisma.ecommerce_mall_integration_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      integration_type: true,
      api_endpoint: true,
      request_method: true,
      response_status: true,
      error_message: true,
      duration_ms: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_integration_logs.count({
    where,
  });
  return {
    data: data.map((log) => ({
      id: log.id as string & tags.Format<"uuid">,
      integration_type: log.integration_type,
      api_endpoint: log.api_endpoint,
      request_method: log.request_method,
      response_status: log.response_status as number & tags.Type<"int32">,
      error_message: log.error_message,
      duration_ms: log.duration_ms as number & tags.Type<"int32">,
      created_at: toISOStringSafe(log.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
