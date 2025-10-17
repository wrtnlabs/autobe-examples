import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategories";

export async function getDiscussionBoardDiscussionBoardCategoriesDiscussionBoardCategoryId(props: {
  discussionBoardCategoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardDiscussionBoardCategories> {
  const result =
    await MyGlobal.prisma.discussion_board_categories.findUniqueOrThrow({
      where: { id: props.discussionBoardCategoryId },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: result.id,
    name: result.name,
    description: result.description ?? null,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
  };
}
