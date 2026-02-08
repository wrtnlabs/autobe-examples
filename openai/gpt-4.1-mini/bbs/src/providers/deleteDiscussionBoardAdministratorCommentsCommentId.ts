import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdministratorCommentsCommentId(props: {
  administrator: AdministratorPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  // The administrator is authorized to delete any comment
  await MyGlobal.prisma.discussion_board_comments.delete({
    where: { id: props.commentId },
  });
}
