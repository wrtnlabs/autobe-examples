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
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  // Build orderBy
  const orderBy: Prisma.reddit_like_comment_snapshotsOrderByWithRelationInput =
    {};
  if (sort === "id") {
    orderBy.id = order;
  } else {
    orderBy.created_at = order;
  }
  const snapshots =
    await MyGlobal.prisma.reddit_like_comment_snapshots.findMany({
      where: { comment_id: props.commentId },
      skip,
      take: limit,
      orderBy,
    });
  const total = await MyGlobal.prisma.reddit_like_comment_snapshots.count({
    where: { comment_id: props.commentId },
  });
  const data: IRedditLikeCommentSnapshot[] = snapshots.map((snapshot) => ({
    id: snapshot.id as string & tags.Format<"uuid">,
    commentId: snapshot.comment_id as string & tags.Format<"uuid">,
    body: snapshot.body,
    editReason: snapshot.edit_reason,
    createdAt: snapshot.created_at.toISOString() as string &
      tags.Format<"date-time">,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  };
}
