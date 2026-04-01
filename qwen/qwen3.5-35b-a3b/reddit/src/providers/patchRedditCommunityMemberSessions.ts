import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import { IRedditCommunityDateTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityDateTimeRange";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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
  const whereInput: Prisma.reddit_community_member_sessionsWhereInput = {
    member_id: props.member.id,
    deleted_at: props.body.deleted_at === true ? undefined : null,
  };
  if (props.body.created_at !== undefined && props.body.created_at !== null) {
    whereInput.created_at = {};
    const createdRange = props.body.created_at;
    if (createdRange.gte !== undefined) {
      whereInput.created_at.gte = new Date(createdRange.gte);
    }
    if (createdRange.lte !== undefined) {
      whereInput.created_at.lte = new Date(createdRange.lte);
    }
  }
  if (props.body.expired_at !== undefined && props.body.expired_at !== null) {
    whereInput.expired_at = {};
    const expiredRange = props.body.expired_at;
    if (expiredRange.gte !== undefined) {
      whereInput.expired_at.gte = new Date(expiredRange.gte);
    }
    if (expiredRange.lte !== undefined) {
      whereInput.expired_at.lte = new Date(expiredRange.lte);
    }
  }
  if (props.body.ip !== undefined && props.body.ip !== null) {
    whereInput.ip = props.body.ip;
  }
  const orderByInput: Prisma.reddit_community_member_sessionsOrderByWithRelationInput =
    props.body.sort === "expired_at"
      ? { expired_at: props.body.direction === "asc" ? "asc" : "desc" }
      : props.body.sort === "ip"
        ? { ip: props.body.direction === "asc" ? "asc" : "desc" }
        : { created_at: props.body.direction === "asc" ? "asc" : "desc" };
  const data = await MyGlobal.prisma.reddit_community_member_sessions.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
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
