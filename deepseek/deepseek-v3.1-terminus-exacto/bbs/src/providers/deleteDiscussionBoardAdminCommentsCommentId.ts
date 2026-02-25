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

export async function deleteDiscussionBoardAdminCommentsCommentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify comment exists
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
    } satisfies Prisma.discussion_board_commentsFindUniqueOrThrowArgs["where"],
  });
  // Perform soft delete
  await MyGlobal.prisma.discussion_board_comments.update({
    where: {
      id: props.commentId,
    } satisfies Prisma.discussion_board_commentsUpdateArgs["where"],
    data: {
      deleted_at: toISOStringSafe(new Date()),
    } satisfies Prisma.discussion_board_commentsUpdateArgs["data"],
  });
}
