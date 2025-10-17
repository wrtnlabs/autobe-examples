import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminDiscussionBoardCategoriesDiscussionBoardCategoryId(props: {
  admin: AdminPayload;
  discussionBoardCategoryId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDiscussionBoardCategory.IUpdate;
}): Promise<IDiscussionBoardDiscussionBoardCategory> {
  const { discussionBoardCategoryId, body } = props;

  const existingCategory =
    await MyGlobal.prisma.discussion_board_categories.findFirst({
      where: {
        id: discussionBoardCategoryId,
        deleted_at: null,
      },
    });

  if (!existingCategory) {
    throw new HttpException("Discussion board category not found", 404);
  }

  const duplicateCategory =
    await MyGlobal.prisma.discussion_board_categories.findFirst({
      where: {
        name: body.name,
        deleted_at: null,
        NOT: {
          id: discussionBoardCategoryId,
        },
      },
    });

  if (duplicateCategory) {
    throw new HttpException("Category name already exists", 409);
  }

  const updated = await MyGlobal.prisma.discussion_board_categories.update({
    where: { id: discussionBoardCategoryId },
    data: {
      name: body.name,
      description: body.description ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
