import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityUserKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserKarmaHistory";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarmaHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityUserKarmaHistoryAtSummaryTransformer } from "../transformers/RedditCommunityUserKarmaHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberKarmaHistories(props: {
  member: MemberPayload;
  body: IRedditCommunityUserKarmaHistory.IRequest;
}): Promise<IPageIRedditCommunityUserKarmaHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    user_id: props.member.id,
    ...(props.body.source_type !== undefined && {
      source_type: props.body.source_type,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.voter_id !== undefined && { voter_id: props.body.voter_id }),
  } satisfies Prisma.reddit_community_user_karma_historiesWhereInput;
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.reddit_community_user_karma_historiesOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.reddit_community_user_karma_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityUserKarmaHistoryAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_community_user_karma_histories.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityUserKarmaHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
