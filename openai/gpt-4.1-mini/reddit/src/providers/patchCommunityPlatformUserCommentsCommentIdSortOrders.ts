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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserCommentsCommentIdSortOrders(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentSortOrder.IRequest;
}): Promise<ICommunityPlatformComment.IInvert> {
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Since ICommunityPlatformCommentSortOrder.IRequest is empty, no updates are done.
  // Return the found comment as the inverted representation (IInvert) directly.
  // Map database record to IInvert response
  // Considering IInvert schema empty, returning an empty object
  return {};
}
