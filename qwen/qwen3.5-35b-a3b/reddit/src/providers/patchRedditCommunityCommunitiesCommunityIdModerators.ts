import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
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
import { RedditCommunityModeratorAtSummaryTransformer } from "../transformers/RedditCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunitiesCommunityIdModerators(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityModerator.IRequest;
}): Promise<IPageIRedditCommunityModerator.ISummary> {
  // Build filters from body
  const whereInput: Prisma.reddit_community_moderatorsWhereInput = {
    reddit_community_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.search && {
      moderator: {
        username: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
    }),
    ...(props.body.added_by_username && {
      addedBy: {
        username: {
          contains: props.body.added_by_username,
          mode: "insensitive" as const,
        },
      },
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  };
  // Build sort order
  const orderByInput =
    props.body.sort === "username"
      ? [{ moderator: { username: props.body.order ?? ("desc" as const) } }]
      : [{ created_at: props.body.order ?? ("desc" as const) }];
  // Get pagination params
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query moderators
  const data = await MyGlobal.prisma.reddit_community_moderators.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditCommunityModeratorAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_moderators.count({
    where: whereInput,
  });
  // Transform and return
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityModeratorAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
