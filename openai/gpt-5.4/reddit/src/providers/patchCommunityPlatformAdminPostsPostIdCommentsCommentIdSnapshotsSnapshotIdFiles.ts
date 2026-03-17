import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { ICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshotFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentSnapshotFile";
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

export async function patchCommunityPlatformAdminPostsPostIdCommentsCommentIdSnapshotsSnapshotIdFiles(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentSnapshotFile.IRequest;
}): Promise<IPageICommunityPlatformCommentSnapshotFile.ISummary> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
      },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Not Found", 404);
  }
  const snapshot =
    await MyGlobal.prisma.community_platform_comment_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          community_platform_comment_id: true,
        },
      },
    );
  if (snapshot.community_platform_comment_id !== props.commentId) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderByInput =
    props.body.sort === undefined ||
    props.body.sort === "created_at" ||
    props.body.sort === "created_at_asc"
      ? [{ created_at: "asc" as const }, { id: "asc" as const }]
      : props.body.sort === "created_at_desc"
        ? [{ created_at: "desc" as const }, { id: "desc" as const }]
        : null;
  if (orderByInput === null) {
    throw new HttpException("Invalid sort", 400);
  }
  const whereInput = {
    community_platform_comment_snapshot_id: props.snapshotId,
    deleted_at: null,
  } satisfies Prisma.community_platform_comment_snapshot_filesWhereInput;
  const data =
    await MyGlobal.prisma.community_platform_comment_snapshot_files.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        commentFile: {
          select: {
            id: true,
            original_name: true,
            mime_type: true,
            storage_key: true,
            size: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.community_platform_comment_filesFindManyArgs,
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_comment_snapshot_files.count({
      where: whereInput,
    });
  return {
    data: data.map(
      (row) =>
        ({
          id: row.id,
          commentFile: {
            id: row.commentFile.id,
            original_name: row.commentFile.original_name,
            mime_type: row.commentFile.mime_type,
            storage_key: row.commentFile.storage_key,
            size: row.commentFile.size,
            created_at: row.commentFile.created_at.toISOString(),
            updated_at: row.commentFile.updated_at.toISOString(),
          } satisfies ICommunityPlatformCommentFile.ISummary,
          created_at: row.created_at.toISOString(),
          updated_at: row.updated_at.toISOString(),
          deleted_at: row.deleted_at?.toISOString() ?? null,
        }) satisfies ICommunityPlatformCommentSnapshotFile.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
