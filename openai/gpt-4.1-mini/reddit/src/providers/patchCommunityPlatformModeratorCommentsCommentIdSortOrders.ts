import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommentsCommentIdSortOrders(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentSortOrder.IRequest;
}): Promise<ICommunityPlatformComment> {
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  return {
    id: comment.id as string & tags.Format<"uuid">,
    post_id: comment.post_id as string & tags.Format<"uuid">,
    user_id: comment.user_id as string & tags.Format<"uuid">,
    parent_id:
      comment.parent_id === null
        ? undefined
        : (comment.parent_id as string & tags.Format<"uuid">),
    content: comment.content,
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
  };
}
