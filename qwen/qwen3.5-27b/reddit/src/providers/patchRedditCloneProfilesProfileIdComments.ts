import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommentAtSummaryTransformer } from "../transformers/RedditCloneCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneProfilesProfileIdComments(props: {
  profileId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  // Verify profile exists and is not soft deleted
  await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
    where: {
      id: props.profileId,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.reddit_clone_commentsWhereInput = {
    reddit_clone_user_profile_id: props.profileId,
    deleted_at: null,
    ...(props.body.search && {
      content: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.dateFrom && {
      created_at: {
        gte: new Date(props.body.dateFrom),
      },
    }),
    ...(props.body.dateTo && {
      created_at: {
        lte: new Date(props.body.dateTo),
      },
    }),
  };
  // Build order by clause - use created_at as vote_score is computed
  const sortOrder = props.body.sortOrder ?? "new";
  const sortDirection = props.body.sortDirection ?? "desc";
  const orderByInput: Prisma.reddit_clone_commentsOrderByWithRelationInput = {
    created_at: sortDirection,
  };
  const data = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await RedditCloneCommentAtSummaryTransformer.transformAll(data),
  };
}
