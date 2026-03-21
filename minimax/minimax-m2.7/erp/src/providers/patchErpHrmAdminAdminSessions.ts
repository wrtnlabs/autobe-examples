import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { IErpHrmAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmAdminSessionAtSummaryTransformer } from "../transformers/ErpHrmAdminSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminAdminSessions(props: {
  admin: AdminPayload;
  body: IErpHrmAdminSession.IRequest;
}): Promise<IPageIErpHrmAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date range filter for created_at
  const createdAtRange = {
    ...(props.body.created_at_from !== undefined && {
      gte: new Date(props.body.created_at_from),
    }),
    ...(props.body.created_at_to !== undefined && {
      lte: new Date(props.body.created_at_to),
    }),
  };
  // Build date range filter for expired_at
  const expiredAtRange = {
    ...(props.body.expired_at_from !== undefined && {
      gte: new Date(props.body.expired_at_from),
    }),
    ...(props.body.expired_at_to !== undefined && {
      lte: new Date(props.body.expired_at_to),
    }),
  };
  const whereInput = {
    ...(props.body.erp_hrm_admin_id !== undefined && {
      erp_hrm_admin_id: props.body.erp_hrm_admin_id,
    }),
    ...(Object.keys(createdAtRange).length > 0 && {
      created_at: createdAtRange,
    }),
    ...(Object.keys(expiredAtRange).length > 0 && {
      expired_at: expiredAtRange,
    }),
    ...(props.body.ip !== undefined && {
      ip: {
        contains: props.body.ip,
      },
    }),
  } satisfies Prisma.erp_hrm_admin_sessionsWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_admin_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmAdminSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_admin_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmAdminSessionAtSummaryTransformer.transform,
    ),
  };
}
