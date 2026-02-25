import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminCommentsCommentId(props: {
  superAdmin: SuperadminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Delete the comment (no need to decrement comment count as there's no such field in schema)
  await MyGlobal.prisma.discussion_board_comments.delete({
    where: { id: props.commentId },
  });
}
