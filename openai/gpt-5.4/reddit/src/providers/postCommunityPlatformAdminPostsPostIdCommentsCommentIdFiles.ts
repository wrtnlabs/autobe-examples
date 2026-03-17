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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminPostsPostIdCommentsCommentIdFiles(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentFile.ICreate;
}): Promise<ICommunityPlatformCommentFile> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
    },
  });
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
        deleted_at: true,
      },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Not Found", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is not available", 400);
  }
  void props.admin;
  void props.body;
  throw new HttpException("Forbidden", 403);
}
