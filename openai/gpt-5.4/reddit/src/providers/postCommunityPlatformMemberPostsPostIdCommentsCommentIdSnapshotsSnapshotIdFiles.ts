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
import { CommunityPlatformCommentSnapshotFileCollector } from "../collectors/CommunityPlatformCommentSnapshotFileCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentSnapshotFileTransformer } from "../transformers/CommunityPlatformCommentSnapshotFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdCommentsCommentIdSnapshotsSnapshotIdFiles(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentSnapshotFile.ICreate;
}): Promise<ICommunityPlatformCommentSnapshotFile> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_community_id: true,
      },
    },
  );
  await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      community_platform_post_id: props.postId,
    },
    select: { id: true },
  });
  const snapshot =
    await MyGlobal.prisma.community_platform_comment_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          community_platform_comment_id: props.commentId,
        },
        select: { id: true },
      },
    );
  const banned =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_community_id: post.community_platform_community_id,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (banned !== null) {
    throw new HttpException("Forbidden", 403);
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (prisma) => {
      const duplicated =
        await prisma.community_platform_comment_snapshot_files.findFirst({
          where: {
            community_platform_comment_snapshot_id: snapshot.id,
            commentFile: {
              storage_key: props.body.storage_key,
            },
          },
          select: { id: true },
        });
      if (duplicated !== null) {
        throw new HttpException("Conflict", 409);
      }
      return await prisma.community_platform_comment_snapshot_files.create({
        data: await CommunityPlatformCommentSnapshotFileCollector.collect({
          body: props.body,
          communityPlatformCommentSnapshots: {
            id: snapshot.id,
          },
        }),
        ...CommunityPlatformCommentSnapshotFileTransformer.select(),
      });
    });
    return await CommunityPlatformCommentSnapshotFileTransformer.transform(
      created,
    );
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Conflict", 409);
    }
    throw error;
  }
}
