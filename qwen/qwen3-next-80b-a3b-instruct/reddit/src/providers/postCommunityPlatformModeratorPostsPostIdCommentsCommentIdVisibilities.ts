import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorPostsPostIdCommentsCommentIdVisibilities(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new HttpException(
      "Comment not found or does not belong to this post",
      404,
    );
  }
  // Create or update visibility record using Prisma relation connect syntax
  await MyGlobal.prisma.community_platform_comment_visibilities.upsert({
    where: {
      comment_id: props.commentId,
      user_id: props.moderator.id,
    },
    update: {},
    create: {
      id: v4() as string & tags.Format<"uuid">,
      comment: {
        connect: {
          id: props.commentId,
        },
      },
      user: {
        connect: {
          id: props.moderator.id,
        },
      },
      is_visible: true,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
