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
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Parse sort order with default (deleted_at descending)
  const orderByInput: Prisma.reddit_community_comment_deletionsOrderByWithRelationInput =
    (() => {
      const sort = props.body.sort ?? "-deleted_at";
      if (sort === "deleted_at") {
        return { deleted_at: "asc" as const };
      }
      return { deleted_at: "desc" as const };
    })();
  // Build WHERE clause properly without self-reference
  const baseWhere: Prisma.reddit_community_comment_deletionsWhereInput = {
    reddit_community_comment_id: props.commentId,
  };
  const whereCondition: Prisma.reddit_community_comment_deletionsWhereInput = {
    ...baseWhere,
    ...(props.body.deleted_atFrom !== undefined && {
      deleted_at: { gte: new Date(props.body.deleted_atFrom) },
    }),
    ...(props.body.deleted_atTo !== undefined && {
      deleted_at: { lte: new Date(props.body.deleted_atTo) },
    }),
    ...(props.body.deleted_by_id !== null && {
      deleted_by_id: props.body.deleted_by_id,
    }),
    ...(props.body.deletion_reason !== null &&
      props.body.deletion_reason !== undefined && {
        deletion_reason: {
          contains: props.body.deletion_reason,
          mode: "insensitive" as const,
        },
      }),
  };
  // Query for paginated data
  const data =
    await MyGlobal.prisma.reddit_community_comment_deletions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityCommentDeletionAtSummaryTransformer.select(),
    });
  // Query for total count
  const total = await MyGlobal.prisma.reddit_community_comment_deletions.count({
    where: whereCondition,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityCommentDeletionAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    data: transformedData,
    pagination,
  } satisfies IPageIRedditCommunityCommentDeletion.ISummary;
}
