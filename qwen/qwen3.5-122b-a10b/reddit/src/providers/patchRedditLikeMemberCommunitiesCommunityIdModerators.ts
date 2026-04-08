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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityModeratorAtSummaryTransformer } from "../transformers/RedditLikeCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityModerator.IRequest;
}): Promise<IPageIRedditLikeCommunityModerator.ISummary> {
  // Validate community exists and is not soft-deleted
  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
  });
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const offset = props.body.offset ?? (page - 1) * limit;
  // Build where clause
  const whereInput = {
    reddit_like_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.search && {
      member: {
        username: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    }),
  } satisfies Prisma.reddit_like_community_moderatorsWhereInput;
  // Execute findMany with pagination
  const records =
    await MyGlobal.prisma.reddit_like_community_moderators.findMany({
      where: whereInput,
      skip: offset,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...RedditLikeCommunityModeratorAtSummaryTransformer.select(),
    });
  // Execute count for total
  const total = await MyGlobal.prisma.reddit_like_community_moderators.count({
    where: whereInput,
  });
  // Transform and return
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
