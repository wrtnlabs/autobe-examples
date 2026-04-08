import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeUserProfile";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeUserProfileAtSummaryTransformer } from "../transformers/RedditLikeUserProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeProfiles(props: {
  body: IRedditLikeUserProfile.IRequest;
}): Promise<IPageIRedditLikeUserProfile.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const offset = props.body.offset ?? (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.reddit_like_user_profilesWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      display_name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.karma_score_min !== undefined && {
      karma_score: {
        gte: props.body.karma_score_min,
      },
    }),
    ...(props.body.karma_score_max !== undefined && {
      karma_score: {
        lte: props.body.karma_score_max,
      },
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
  // Build order by clause
  const sort = props.body.sort ?? "created_at";
  const sortDirection = props.body.sort_direction ?? "desc";
  const orderByInput: Prisma.reddit_like_user_profilesOrderByWithRelationInput =
    {
      [sort]: sortDirection,
    };
  // Fetch paginated records
  const records = await MyGlobal.prisma.reddit_like_user_profiles.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: offset,
    take: limit,
    ...RedditLikeUserProfileAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_user_profiles.count({
    where: whereInput,
  });
  // Transform records to response format
  const data = await ArrayUtil.asyncMap(
    records,
    RedditLikeUserProfileAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
