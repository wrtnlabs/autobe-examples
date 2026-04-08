import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommentSnapshot";
import { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommentSnapshotAtSummaryTransformer } from "../transformers/RedditCloneCommentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePostsPostIdCommentsCommentIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneCommentSnapshot.IRequest;
}): Promise<IPageIRedditCloneCommentSnapshot.ISummary> {
  // Validate post exists
  await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Validate comment exists
  await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    reddit_clone_comment_id: props.commentId,
    ...(props.body.search && {
      content: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.from_date && {
      snapshot_created_at: {
        gte: new Date(props.body.from_date),
      },
    }),
    ...(props.body.to_date && {
      snapshot_created_at: {
        lte: new Date(props.body.to_date),
      },
    }),
  } satisfies Prisma.reddit_clone_comment_snapshotsWhereInput;
  // Build order by clause
  const orderByInput = (
    props.body.sort === "snapshot_created_at_asc"
      ? { snapshot_created_at: "asc" as const }
      : props.body.sort === "snapshot_created_at_desc"
        ? { snapshot_created_at: "desc" as const }
        : props.body.sort === "created_at_asc"
          ? { created_at: "asc" as const }
          : props.body.sort === "created_at_desc"
            ? { created_at: "desc" as const }
            : { snapshot_created_at: "desc" as const }
  ) satisfies Prisma.reddit_clone_comment_snapshotsOrderByWithRelationInput;
  // Fetch snapshots with pagination
  const records = await MyGlobal.prisma.reddit_clone_comment_snapshots.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneCommentSnapshotAtSummaryTransformer.select(),
    },
  );
  // Count total records
  const total = await MyGlobal.prisma.reddit_clone_comment_snapshots.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneCommentSnapshotAtSummaryTransformer.transform,
    ),
  };
}
