import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        content: true,
        is_deleted: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user_id: true,
        user: { select: { id: true } },
        post: { select: { id: true, community_id: true } },
      },
    });
  const isAuthor = comment.user_id === props.user.id;
  let isModeratorOrAdmin = false;
  if (!isAuthor) {
    const modRecord =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: comment.post.community_id,
          community_platform_user_id: props.user.id,
        },
      });
    isModeratorOrAdmin = modRecord !== null;
  }
  if (!isAuthor && !isModeratorOrAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: Prisma.community_platform_commentsUpdateInput = {
    ...(props.body.content !== undefined && { content: props.body.content }),
    updated_at: new Date().toISOString(),
  };
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: updateData,
  });
  const updatedComment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...CommunityPlatformCommentTransformer.select(),
    });
  return await CommunityPlatformCommentTransformer.transform(updatedComment);
}
