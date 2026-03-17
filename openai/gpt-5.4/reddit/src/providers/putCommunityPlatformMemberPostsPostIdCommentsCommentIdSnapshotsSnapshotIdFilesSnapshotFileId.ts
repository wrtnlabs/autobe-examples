import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import { ICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshotFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentSnapshotFileTransformer } from "../transformers/CommunityPlatformCommentSnapshotFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostIdCommentsCommentIdSnapshotsSnapshotIdFilesSnapshotFileId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  snapshotFileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentSnapshotFile.IUpdate;
}): Promise<ICommunityPlatformCommentSnapshotFile> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_community_id: true,
        deleted_at: true,
      },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Post unavailable", 404);
  }
  const comment =
    await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
      where: {
        id: props.commentId,
        community_platform_post_id: props.postId,
      },
      select: {
        id: true,
        community_platform_member_id: true,
        deleted_at: true,
      },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment unavailable", 404);
  }
  if (comment.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const banned =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_community_id: post.community_platform_community_id,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (banned !== null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_comment_snapshots.findFirstOrThrow({
    where: {
      id: props.snapshotId,
      community_platform_comment_id: props.commentId,
    },
    select: {
      id: true,
    },
  });
  const current =
    await MyGlobal.prisma.community_platform_comment_snapshot_files.findFirstOrThrow(
      {
        where: {
          id: props.snapshotFileId,
          community_platform_comment_snapshot_id: props.snapshotId,
        },
        select: {
          id: true,
          community_platform_comment_snapshot_id: true,
          community_platform_comment_file_id: true,
        },
      },
    );
  if (props.body.community_platform_comment_file_id !== undefined) {
    await MyGlobal.prisma.community_platform_comment_files.findFirstOrThrow({
      where: {
        id: props.body.community_platform_comment_file_id,
        community_platform_comment_id: props.commentId,
      },
      select: {
        id: true,
      },
    });
  }
  const targetFileId =
    props.body.community_platform_comment_file_id ??
    current.community_platform_comment_file_id;
  const duplicate =
    await MyGlobal.prisma.community_platform_comment_snapshot_files.findFirst({
      where: {
        community_platform_comment_snapshot_id:
          current.community_platform_comment_snapshot_id,
        community_platform_comment_file_id: targetFileId,
        id: {
          not: current.id,
        },
      },
      select: {
        id: true,
      },
    });
  if (duplicate !== null) {
    throw new HttpException("Snapshot file association already exists", 409);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const target =
      await tx.community_platform_comment_snapshot_files.findFirstOrThrow({
        where: {
          id: props.snapshotFileId,
          community_platform_comment_snapshot_id: props.snapshotId,
        },
        select: {
          id: true,
          community_platform_comment_snapshot_id: true,
          community_platform_comment_file_id: true,
        },
      });
    const nextFileId =
      props.body.community_platform_comment_file_id ??
      target.community_platform_comment_file_id;
    const recheckedDuplicate =
      await tx.community_platform_comment_snapshot_files.findFirst({
        where: {
          community_platform_comment_snapshot_id:
            target.community_platform_comment_snapshot_id,
          community_platform_comment_file_id: nextFileId,
          id: {
            not: target.id,
          },
        },
        select: {
          id: true,
        },
      });
    if (recheckedDuplicate !== null) {
      throw new HttpException("Snapshot file association already exists", 409);
    }
    await tx.community_platform_comment_snapshot_files.update({
      where: {
        id: target.id,
      },
      data: {
        ...(props.body.community_platform_comment_file_id !== undefined
          ? {
              community_platform_comment_file_id:
                props.body.community_platform_comment_file_id,
            }
          : {}),
        ...(props.body.deleted_at !== undefined
          ? {
              deleted_at: props.body.deleted_at,
            }
          : {}),
      },
    });
    return await tx.community_platform_comment_snapshot_files.findUniqueOrThrow(
      {
        where: {
          id: target.id,
        },
        ...CommunityPlatformCommentSnapshotFileTransformer.select(),
      },
    );
  });
  return await CommunityPlatformCommentSnapshotFileTransformer.transform(
    updated,
  );
}
