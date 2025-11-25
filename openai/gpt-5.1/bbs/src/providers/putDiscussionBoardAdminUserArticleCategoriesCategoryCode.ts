import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putDiscussionBoardAdminUserArticleCategoriesCategoryCode(props: {
  adminUser: AdminuserPayload;
  categoryCode: string;
  body: IDiscussionBoardArticleCategory.IUpdate;
}): Promise<IDiscussionBoardArticleCategory> {
  // Look up an active (non-retired) category by its stable business code.
  const existing =
    await MyGlobal.prisma.discussion_board_article_categories.findFirst({
      where: {
        code: props.categoryCode,
        deleted_at: null,
      },
    });

  if (existing === null) {
    throw new HttpException("Category not found", 404);
  }

  // Apply only the fields that are present in the update DTO.
  const updated =
    await MyGlobal.prisma.discussion_board_article_categories.update({
      where: {
        id: existing.id,
      },
      data: {
        ...(props.body.name !== undefined ? { name: props.body.name } : {}),
        ...(props.body.description !== undefined
          ? { description: props.body.description }
          : {}),
        ...(props.body.order !== undefined ? { order: props.body.order } : {}),
        // `updated_at` is assumed to be maintained by database defaults or middleware.
      },
    });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description !== null ? updated.description : null,
    order: updated.order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
