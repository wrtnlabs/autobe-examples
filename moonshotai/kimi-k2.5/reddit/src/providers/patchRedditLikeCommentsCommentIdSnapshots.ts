import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommentSnapshot";
import { IRedditLikeCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommentsCommentIdSnapshots(props: {
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeCommentSnapshot.IRequest;
}): Promise<IPageIRedditLikeCommentSnapshot> {
  // Verify comment exists
  await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting parameters
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  // Build where clause
  const where: Prisma.reddit_like_comment_snapshotsWhereInput = {
    comment_id: props.commentId,
  };
  // Build order by
  const orderBy: Prisma.reddit_like_comment_snapshotsOrderByWithRelationInput =
    sortField === "id" ? { id: sortOrder } : { created_at: sortOrder };
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.reddit_like_comment_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        comment_id: true,
        body: true,
        edit_reason: true,
        created_at: true,
      },
    });
  // Count total records
  const total = await MyGlobal.prisma.reddit_like_comment_snapshots.count({
    where,
  });
  // Transform to DTO format
  const data: IRedditLikeCommentSnapshot[] = snapshots.map((snapshot) => ({
    id: snapshot.id,
    commentId: snapshot.comment_id,
    body: snapshot.body,
    editReason: snapshot.edit_reason,
    createdAt: toISOStringSafe(snapshot.created_at),
  }));
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
