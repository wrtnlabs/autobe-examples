import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminDiscussionBoardCategoriesDiscussionBoardCategoryId(props: {
  admin: AdminPayload;
  discussionBoardCategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, discussionBoardCategoryId } = props;

  // Verify category exists or throw 404
  await MyGlobal.prisma.discussion_board_categories.findUniqueOrThrow({
    where: { id: discussionBoardCategoryId },
  });

  // Hard delete category, cascade delete posts via DB constraints
  await MyGlobal.prisma.discussion_board_categories.delete({
    where: { id: discussionBoardCategoryId },
  });
}
