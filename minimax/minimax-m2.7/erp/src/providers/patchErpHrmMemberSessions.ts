import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    erp_hrm_member_id: props.member.id,
    ...(props.body.ip && { ip: props.body.ip }),
    ...(props.body.referrer && { referrer: { contains: props.body.referrer } }),
    ...(props.body.status === "active" && {
      token_expired_at: { gt: new Date() },
    }),
    ...(props.body.status === "expired" && {
      token_expired_at: { lte: new Date() },
    }),
    ...(props.body.token_expired !== undefined && {
      token_expired_at: props.body.token_expired
        ? { lte: new Date() }
        : { gt: new Date() },
    }),
  } satisfies Prisma.erp_hrm_member_sessionsWhereInput;
  if (props.body.created_from || props.body.created_to) {
    const createdAtCondition: {
      gte?: Date;
      lte?: Date;
    } = {};
    if (props.body.created_from) {
      createdAtCondition.gte = new Date(props.body.created_from);
    }
    if (props.body.created_to) {
      createdAtCondition.lte = new Date(props.body.created_to);
    }
    Object.assign(whereInput, { created_at: createdAtCondition });
  }
  const data = await MyGlobal.prisma.erp_hrm_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_member_sessions.count({
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
      ErpHrmMemberSessionAtSummaryTransformer.transform,
    ),
  };
}
