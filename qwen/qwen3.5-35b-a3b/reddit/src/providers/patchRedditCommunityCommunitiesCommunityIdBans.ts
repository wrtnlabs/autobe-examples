import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityBanAtSummaryTransformer } from "../transformers/RedditCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunitiesCommunityIdBans(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityBan.IRequest;
}): Promise<IPageIRedditCommunityBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build filters
  const whereInput: Prisma.reddit_community_bansWhereInput = {
    reddit_community_id: props.communityId,
    deleted_at: null,
    banned_at: {
      ...(props.body.banned_at_from && {
        gte: new Date(props.body.banned_at_from),
      }),
      ...(props.body.banned_at_to && {
        lte: new Date(props.body.banned_at_to),
      }),
    },
    banned_by_moderator_id: props.body.banned_by_moderator_id,
    bannedMember: props.body.text_search
      ? {
          username: {
            contains: props.body.text_search,
          },
        }
      : undefined,
  };
  // Query bans with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { banned_at: "desc" },
      ...RedditCommunityBanAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_bans.count({
      where: whereInput,
    }),
  ]);
  const transformed = await ArrayUtil.asyncMap(data, (ban) =>
    RedditCommunityBanAtSummaryTransformer.transform(ban),
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
