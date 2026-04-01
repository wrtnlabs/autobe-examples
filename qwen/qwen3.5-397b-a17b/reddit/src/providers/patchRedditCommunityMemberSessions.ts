import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityMemberSessionAtSummaryTransformer } from "../transformers/RedditCommunityMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberSessions(props: {
  member: MemberPayload;
  body: IRedditCommunityMemberSession.IRequest;
}): Promise<IPageIRedditCommunityMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput: Prisma.reddit_community_member_sessionsWhereInput = {
    reddit_community_member_id: props.member.id,
    ...(props.body.status && {
      expired_at: props.body.status === "active" ? { gt: now } : { lte: now },
    }),
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.search && {
      OR: [
        { ip: { contains: props.body.search } },
        { href: { contains: props.body.search } },
        { referrer: { contains: props.body.search } },
      ],
    }),
  };
  const orderByInput: Prisma.reddit_community_member_sessionsOrderByWithRelationInput =
    props.body.sort === "created_at"
      ? { created_at: "desc" }
      : { created_at: "desc" };
  const data = await MyGlobal.prisma.reddit_community_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_member_sessions.count({
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
      RedditCommunityMemberSessionAtSummaryTransformer.transform,
    ),
  };
}
