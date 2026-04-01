import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentDeletion";
import { IRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentDeletion";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommentDeletionAtSummaryTransformer } from "../transformers/RedditCommunityCommentDeletionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommentsCommentIdDeletions(props: {
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentDeletion.IRequest;
}): Promise<IPageIRedditCommunityCommentDeletion.ISummary> {
  // Validate comment exists
  await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: { id: true },
  });
  // Pagination parameters with defaults
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const pageLimit: number = Math.min(limit, 100);
  const skip: number = (page - 1) * pageLimit;
  // Sort order
  const orderByInput: Prisma.reddit_community_comment_deletionsOrderByWithRelationInput[] =
    props.body.sort === "-deleted_at"
      ? [{ deleted_at: "desc" as const }]
      : [{ deleted_at: "asc" as const }];
  // Build filter conditions
  const whereInput: Prisma.reddit_community_comment_deletionsWhereInput = {
    reddit_community_comment_id: props.commentId,
    ...(props.body.deleted_atFrom
      ? { deleted_at: { gte: props.body.deleted_atFrom } }
      : {}),
    ...(props.body.deleted_atTo
      ? { deleted_at: { lte: props.body.deleted_atTo } }
      : {}),
    ...(props.body.deleted_by_id !== null
      ? { deleted_by_id: props.body.deleted_by_id }
      : {}),
    ...(props.body.deletion_reason !== null
      ? { deletion_reason: { contains: props.body.deletion_reason } }
      : {}),
  } satisfies Prisma.reddit_community_comment_deletionsWhereInput;
  // Query with pagination and join
  const data: Array<RedditCommunityCommentDeletionAtSummaryTransformer.Payload> =
    await MyGlobal.prisma.reddit_community_comment_deletions.findMany({
      where: whereInput,
      skip,
      take: pageLimit,
      orderBy: orderByInput,
      ...RedditCommunityCommentDeletionAtSummaryTransformer.select(),
    });
  // Get total count
  const total: number =
    await MyGlobal.prisma.reddit_community_comment_deletions.count({
      where: whereInput,
    });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit: pageLimit,
      records: total,
      pages: Math.ceil(total / pageLimit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityCommentDeletionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityCommentDeletion.ISummary;
}
