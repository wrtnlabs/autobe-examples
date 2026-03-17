import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentFileCollector } from "../collectors/CommunityPlatformCommentFileCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentFileTransformer } from "../transformers/CommunityPlatformCommentFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdCommentsCommentIdFiles(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentFile.ICreate;
}): Promise<ICommunityPlatformCommentFile> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
      },
    },
  );
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_member_id: true,
        deleted_at: true,
      },
    });
  if (comment.community_platform_post_id !== post.id) {
    throw new HttpException("Not Found", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is not available", 400);
  }
  if (comment.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existing =
    await MyGlobal.prisma.community_platform_comment_files.findUnique({
      where: {
        storage_key: props.body.storage_key,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("Storage key already exists", 409);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const duplicated = await tx.community_platform_comment_files.findUnique({
      where: {
        storage_key: props.body.storage_key,
      },
      select: {
        id: true,
      },
    });
    if (duplicated !== null) {
      throw new HttpException("Storage key already exists", 409);
    }
    return await tx.community_platform_comment_files.create({
      data: await CommunityPlatformCommentFileCollector.collect({
        body: props.body,
        comment: {
          id: comment.id,
        },
      }),
      ...CommunityPlatformCommentFileTransformer.select(),
    });
  });
  return await CommunityPlatformCommentFileTransformer.transform(created);
}
