import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityMemberSessionAtSummaryTransformer } from "../transformers/CommunityMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberSessions(props: {
  member: MemberPayload;
  body: ICommunityMemberSession.IRequest;
}): Promise<IPageICommunityMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const now = new Date();
  const createdAtFilter = {
    ...(props.body.created_from !== undefined && {
      gte: new Date(props.body.created_from),
    }),
    ...(props.body.created_to !== undefined && {
      lte: new Date(props.body.created_to),
    }),
  };
  const whereInput = {
    community_member_id: props.member.id,
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip, mode: "insensitive" as const },
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(props.body.is_expired === true && { expired_at: { lt: now } }),
    ...(props.body.is_expired === false && { expired_at: { gte: now } }),
  } satisfies Prisma.community_member_sessionsWhereInput;
  const data = await MyGlobal.prisma.community_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_member_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
