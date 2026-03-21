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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentAtSummaryTransformer } from "../transformers/RedditCloneCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Determine sort order based on sortBy parameter
  // 'best': highest vote score first
  // 'new': most recent first
  // 'controversial': scores near zero first (controversial = balanced votes), then by total votes
  const orderByInput = (
    props.body.sortBy === "best"
      ? [{ vote_score: "desc" as const }, { created_at: "desc" as const }]
      : props.body.sortBy === "new"
        ? { created_at: "desc" as const }
        : props.body.sortBy === "controversial"
          ? [{ vote_score: "asc" as const }, { created_at: "desc" as const }]
          : [{ vote_score: "desc" as const }, { created_at: "desc" as const }]
  ) satisfies
    | Prisma.reddit_clone_commentsOrderByWithRelationInput
    | Prisma.reddit_clone_commentsOrderByWithRelationInput[];
  const whereInput = {
    reddit_clone_post_id: props.postId,
    deleted_at: null,
  } satisfies Prisma.reddit_clone_commentsWhereInput;
  // Fetch paginated comments
  const data = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneCommentAtSummaryTransformer.select(),
  });
  // Count total records for pagination metadata
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneCommentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
