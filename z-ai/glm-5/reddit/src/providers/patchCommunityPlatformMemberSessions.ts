import { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformMemberSessionAtSummaryTransformer } from "../transformers/CommunityPlatformMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberSessions(props: {
  member: MemberPayload;
  body: ICommunityPlatformMemberSession.IRequest;
}): Promise<IPageICommunityPlatformMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause = {
    community_platform_member_id: props.member.id,
    ...(props.body.active === true && { expired_at: { gt: new Date() } }),
  } satisfies Prisma.community_platform_member_sessionsWhereInput;
  const data =
    await MyGlobal.prisma.community_platform_member_sessions.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...CommunityPlatformMemberSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.community_platform_member_sessions.count({
    where: whereClause,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
