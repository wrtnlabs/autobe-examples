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
import { RedditCloneCommunityModeratorAtSummaryTransformer } from "../transformers/RedditCloneCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModerators(props: {
  body: IRedditCloneCommunityModerator.IRequest;
}): Promise<IPageIRedditCloneCommunityModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.reddit_clone_community_moderatorsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id && {
      reddit_clone_community_id: props.body.community_id,
    }),
    ...(props.body.user_profile_id && {
      reddit_clone_user_profile_id: props.body.user_profile_id,
    }),
    ...(props.body.role && {
      role: props.body.role,
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  };
  // Build ORDER BY clause
  const orderByInput: Prisma.reddit_clone_community_moderatorsOrderByWithRelationInput =
    props.body.sortBy === "created_at"
      ? { created_at: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "updated_at"
        ? { updated_at: props.body.sortOrder ?? "desc" }
        : { created_at: "desc" };
  // Fetch data
  const data = await MyGlobal.prisma.reddit_clone_community_moderators.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneCommunityModeratorAtSummaryTransformer.select(),
    },
  );
  // Fetch total count
  const total = await MyGlobal.prisma.reddit_clone_community_moderators.count({
    where: whereInput,
  });
  // Transform data
  const transformed = await ArrayUtil.asyncMap(
    data,
    RedditCloneCommunityModeratorAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformed,
  };
}
