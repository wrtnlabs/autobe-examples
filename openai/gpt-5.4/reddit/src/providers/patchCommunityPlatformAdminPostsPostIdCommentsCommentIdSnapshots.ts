import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPostsPostIdCommentsCommentIdSnapshots(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentSnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommentSnapshot.ISummary> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    },
  );
  if (post.deleted_at !== null || post.status !== "active") {
    throw new HttpException("Not Found", 404);
  }
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (
    comment.community_platform_post_id !== post.id ||
    comment.deleted_at !== null ||
    comment.status !== "active"
  ) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    community_platform_comment_id: props.commentId,
  } satisfies Prisma.community_platform_comment_snapshotsWhereInput;
  const orderBy = (
    props.body.sort === "id"
      ? [{ id: "asc" }]
      : props.body.sort === "-id"
        ? [{ id: "desc" }]
        : props.body.sort === "created_at"
          ? [{ id: "asc" }]
          : [{ id: "desc" }]
  ) satisfies Prisma.community_platform_comment_snapshotsOrderByWithRelationInput[];
  const data =
    await MyGlobal.prisma.community_platform_comment_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        comment: {
          select: {},
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_comment_snapshots.count({
      where,
    });
  return {
    data: data.map(
      (snapshot) =>
        ({
          id: snapshot.id,
          comment: {} satisfies ICommunityPlatformComment.ISummary,
        }) satisfies ICommunityPlatformCommentSnapshot.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
