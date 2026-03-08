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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteDiscussionBoardAdminTagsTagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify tag exists - will throw 404 if not found
  await MyGlobal.prisma.discussion_board_tags.findUniqueOrThrow({
    where: { id: props.tagId },
  });
  // Soft delete by setting deleted_at timestamp
  // Database cascade will automatically remove discussion_board_article_tags
  await MyGlobal.prisma.discussion_board_tags.update({
    where: { id: props.tagId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
