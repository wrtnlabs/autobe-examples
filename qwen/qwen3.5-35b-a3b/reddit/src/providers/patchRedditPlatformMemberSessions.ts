import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberSessionAtSummaryTransformer } from "../transformers/RedditPlatformMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberSessions(props: {
  member: MemberPayload;
  body: IRedditPlatformMemberSession.IRequest;
}): Promise<IPageIRedditPlatformMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.reddit_platform_member_sessionsWhereInput = {
    member_id: props.member.id,
  };
  if (props.body.status === "active") {
    whereClause.expired_at = { gt: new Date() };
  } else if (props.body.status === "expired") {
    whereClause.expired_at = { lte: new Date() };
  }
  if (props.body.start_date !== undefined) {
    whereClause.created_at = {
      gte: new Date(props.body.start_date + "T00:00:00Z"),
    };
  }
  if (props.body.end_date !== undefined) {
    if (whereClause.created_at) {
      whereClause.created_at = {
        gte:
          (whereClause.created_at as any).gte ??
          new Date("1970-01-01T00:00:00Z"),
        lte: new Date(props.body.end_date + "T23:59:59Z"),
      };
    } else {
      whereClause.created_at = {
        lte: new Date(props.body.end_date + "T23:59:59Z"),
      };
    }
  }
  const orderByClause: Prisma.reddit_platform_member_sessionsOrderByWithRelationInput[] =
    props.body.sort === "ip"
      ? [{ ip: "asc" as const }]
      : [{ created_at: "desc" as const }];
  const data = await MyGlobal.prisma.reddit_platform_member_sessions.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: orderByClause,
    ...RedditPlatformMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_member_sessions.count({
    where: whereClause,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
