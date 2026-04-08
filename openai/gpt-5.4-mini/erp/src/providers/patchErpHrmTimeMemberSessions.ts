import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeMemberSessionAtSummaryTransformer } from "../transformers/ErpHrmTimeMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberSessions(props: {
  member: MemberPayload;
  body: IErpHrmTimeMemberSession.IRequest;
}): Promise<IPageIErpHrmTimeMemberSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const createdAtFilter:
    | Prisma.DateTimeFilter<"erp_hrm_time_member_sessions">
    | undefined =
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          ...(props.body.createdAtFrom !== undefined && {
            gte: new Date(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo !== undefined && {
            lte: new Date(props.body.createdAtTo),
          }),
        }
      : undefined;
  const expiredAtFilter:
    | Prisma.DateTimeFilter<"erp_hrm_time_member_sessions">
    | undefined =
    props.body.expiredAtFrom !== undefined ||
    props.body.expiredAtTo !== undefined
      ? {
          ...(props.body.expiredAtFrom !== undefined && {
            gte: new Date(props.body.expiredAtFrom),
          }),
          ...(props.body.expiredAtTo !== undefined && {
            lte: new Date(props.body.expiredAtTo),
          }),
        }
      : undefined;
  const where: Prisma.erp_hrm_time_member_sessionsWhereInput = {
    erp_hrm_time_member_id: props.member.id,
    ...(props.body.search !== undefined && {
      OR: [
        { ip: { contains: props.body.search, mode: "insensitive" } },
        { href: { contains: props.body.search, mode: "insensitive" } },
        { referrer: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(expiredAtFilter !== undefined && { expired_at: expiredAtFilter }),
  };
  const orderBy: Prisma.erp_hrm_time_member_sessionsOrderByWithRelationInput =
    props.body.sort === "expiredAt"
      ? { expired_at: props.body.order ?? "desc" }
      : { created_at: props.body.order ?? "desc" };
  const data = await MyGlobal.prisma.erp_hrm_time_member_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimeMemberSessionAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_member_sessions.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeMemberSessionAtSummaryTransformer.transform,
    ),
  };
}
