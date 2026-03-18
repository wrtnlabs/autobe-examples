import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmMemberSessionAtSummaryTransformer } from "../transformers/ErpHrmMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberSessions(props: {
  member: MemberPayload;
  body: IErpHrmMemberSession.IRequest;
}): Promise<IPageIErpHrmMemberSession.ISummary> {
  const { body } = props;
  // Validate date range when both bounds are provided
  if (body.createdAtFrom !== undefined && body.createdAtTo !== undefined) {
    if (new Date(body.createdAtFrom) > new Date(body.createdAtTo)) {
      throw new HttpException(
        "createdAtFrom must not be after createdAtTo",
        400,
      );
    }
  }
  const page = body.page ?? 1;
  const limit = Math.min(body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build created_at range filter
  const createdAtFilter:
    | Prisma.DateTimeFilter<"erp_hrm_member_sessions">
    | undefined =
    body.createdAtFrom !== undefined || body.createdAtTo !== undefined
      ? {
          ...(body.createdAtFrom !== undefined && {
            gte: new Date(body.createdAtFrom),
          }),
          ...(body.createdAtTo !== undefined && {
            lte: new Date(body.createdAtTo),
          }),
        }
      : undefined;
  // Build expired_at filter for isActive
  const expiredAtFilter:
    | Prisma.DateTimeFilter<"erp_hrm_member_sessions">
    | undefined =
    body.isActive === true
      ? { gt: new Date() }
      : body.isActive === false
        ? { lte: new Date() }
        : undefined;
  const whereInput = {
    erp_hrm_member_id: props.member.id,
    ...(body.ip !== undefined && {
      ip: { contains: body.ip, mode: "insensitive" as const },
    }),
    ...(expiredAtFilter !== undefined && { expired_at: expiredAtFilter }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  } satisfies Prisma.erp_hrm_member_sessionsWhereInput;
  const orderByInput = (
    body.sort === "expired_at"
      ? { expired_at: "desc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.erp_hrm_member_sessionsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.erp_hrm_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_member_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
