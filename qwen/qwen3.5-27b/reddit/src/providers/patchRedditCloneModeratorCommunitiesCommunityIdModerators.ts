import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneCommunityModeratorAtSummaryTransformer } from "../transformers/RedditCloneCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorCommunitiesCommunityIdModerators(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityModerator.IRequest;
}): Promise<IPageIRedditCloneCommunityModerator.ISummary> {
  // Verify moderator has permission to view moderators in this community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_user_profile_id: props.moderator.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (moderatorAssignment === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with base filter and optional filters
  const whereInput: Prisma.reddit_clone_community_moderatorsWhereInput = {
    deleted_at: null,
    reddit_clone_community_id: props.communityId,
    ...(props.body.user_profile_id !== undefined && {
      reddit_clone_user_profile_id: props.body.user_profile_id,
    }),
    ...(props.body.role !== undefined && {
      role: props.body.role,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  };
  // Build orderBy clause based on sortBy and sortOrder
  const orderByInput: Prisma.reddit_clone_community_moderatorsOrderByWithRelationInput =
    props.body.sortBy === "updated_at"
      ? { updated_at: props.body.sortOrder ?? "desc" }
      : { created_at: props.body.sortOrder ?? "desc" };
  // Query records with transformer's select for proper field selection
  const records =
    await MyGlobal.prisma.reddit_clone_community_moderators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneCommunityModeratorAtSummaryTransformer.select(),
    });
  // Query total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_clone_community_moderators.count({
    where: whereInput,
  });
  // Transform records using asyncMap for proper async handling
  const data = await ArrayUtil.asyncMap(
    records,
    RedditCloneCommunityModeratorAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
