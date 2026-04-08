import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberSubscribedCommunities(props: {
  member: MemberPayload;
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const subscriptions =
    await MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        community_id: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    });
  const total = await MyGlobal.prisma.reddit_community_subscriptions.count({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  const communityIds = subscriptions.map((s) => s.community_id);
  const communities =
    await MyGlobal.prisma.reddit_community_communities.findMany({
      ...RedditCommunityCommunityAtSummaryTransformer.select(),
      where: {
        id: {
          in: communityIds,
        },
        deleted_at: null,
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      communities,
      RedditCommunityCommunityAtSummaryTransformer.transform,
    ),
  };
}
