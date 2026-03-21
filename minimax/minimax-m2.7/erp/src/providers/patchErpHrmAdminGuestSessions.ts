import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmGuestSessionAtSummaryTransformer } from "../transformers/ErpHrmGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminGuestSessions(props: {
  admin: AdminPayload;
  body: IErpHrmGuestSession.IRequest;
}): Promise<IPageIErpHrmGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const dateCondition: Prisma.erp_hrm_guest_sessionsWhereInput["created_at"] =
    {};
  if (props.body.start_date !== undefined) {
    dateCondition.gte = new Date(props.body.start_date);
  }
  if (props.body.end_date !== undefined) {
    dateCondition.lte = new Date(props.body.end_date);
  }
  const hasDateFilter =
    props.body.start_date !== undefined || props.body.end_date !== undefined;
  const whereInput = {
    ...(props.body.guest_id !== undefined && {
      erp_hrm_guest_id: props.body.guest_id,
    }),
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.href !== undefined && {
      href: { contains: props.body.href },
    }),
    ...(hasDateFilter && { created_at: dateCondition }),
    ...(props.body.expired !== undefined && {
      expired_at: props.body.expired ? { lt: new Date() } : { gt: new Date() },
    }),
  } satisfies Prisma.erp_hrm_guest_sessionsWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_guest_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmGuestSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_guest_sessions.count({
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
      ErpHrmGuestSessionAtSummaryTransformer.transform,
    ),
  };
}
