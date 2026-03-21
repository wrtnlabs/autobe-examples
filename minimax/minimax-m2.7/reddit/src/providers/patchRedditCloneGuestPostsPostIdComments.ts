import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCloneCommentAtSummaryTransformer } from "../transformers/RedditCloneCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestPostsPostIdComments(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting options based on sortBy parameter
  const orderByInput =
    props.body.sortBy === "best"
      ? ({ vote_score: "desc" as const, created_at: "desc" as const } as const)
      : props.body.sortBy === "controversial"
        ? ({ vote_score: "asc" as const } as const)
        : ({ created_at: "desc" as const } as const);
  // Fetch comments for the post (excluding soft-deleted)
  const comments = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: {
      reddit_clone_post_id: props.postId,
      deleted_at: null,
    },
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditCloneCommentAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: {
      reddit_clone_post_id: props.postId,
      deleted_at: null,
    },
  });
  // Transform comments using transformer
  const transformedComments = await ArrayUtil.asyncMap(
    comments,
    RedditCloneCommentAtSummaryTransformer.transform,
  );
  return {
    data: transformedComments,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
