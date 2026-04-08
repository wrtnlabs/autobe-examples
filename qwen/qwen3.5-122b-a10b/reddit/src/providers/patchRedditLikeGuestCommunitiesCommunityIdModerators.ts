import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityModerator";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikeCommunityModeratorAtSummaryTransformer } from "../transformers/RedditLikeCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestCommunitiesCommunityIdModerators(props: {
  guest: GuestPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityModerator.IRequest;
}): Promise<IPageIRedditLikeCommunityModerator.ISummary> {
  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const offset = props.body.offset ?? (page - 1) * limit;
  const whereInput: Prisma.reddit_like_community_moderatorsWhereInput = {
    deleted_at: null,
    reddit_like_community_id: props.communityId,
    ...(props.body.search !== undefined && props.body.search !== null
      ? {
          member: {
            username: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        }
      : {}),
  } satisfies Prisma.reddit_like_community_moderatorsWhereInput;
  const records =
    await MyGlobal.prisma.reddit_like_community_moderators.findMany({
      where: whereInput,
      skip: offset,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditLikeCommunityModeratorAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.reddit_like_community_moderators.count({
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
      records,
      RedditLikeCommunityModeratorAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditLikeCommunityModerator.ISummary;
}
