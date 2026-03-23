import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerMemberSessionAtSummaryTransformer } from "../transformers/HrmTrackerMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTrackerMemberSessions(props: {
  member: MemberPayload;
  body: IHrmTrackerMemberSession.IRequest;
}): Promise<IPageIHrmTrackerMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_tracker_member_sessionsWhereInput = {
    ...(props.body.member_id && { member_id: props.body.member_id }),
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
    ...(props.body.expires_at_start && {
      expires_at: { gte: props.body.expires_at_start },
    }),
    ...(props.body.expires_at_end && {
      expires_at: { lte: props.body.expires_at_end },
    }),
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.revoked === true ? { revoked_at: { not: null } } : {}),
  };
  const data = await MyGlobal.prisma.hrm_tracker_member_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmTrackerMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_tracker_member_sessions.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTrackerMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
