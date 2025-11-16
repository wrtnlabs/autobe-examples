import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function postDiscussionBoardAdminUserArticleCategories(props: {
  adminUser: AdminuserPayload;
  body: IDiscussionBoardArticleCategory.ICreate;
}): Promise<IDiscussionBoardArticleCategory> {
  const { code, name, description, order } = props.body;

  if (order < 0) {
    throw new HttpException("order must be a non-negative integer", 400);
  }

  const existing =
    await MyGlobal.prisma.discussion_board_article_categories.findFirst({
      where: {
        code,
        deleted_at: null,
      },
    });

  if (existing !== null) {
    throw new HttpException("Category code already exists", 409);
  }

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.discussion_board_article_categories.create({
      data: {
        id: v4(),
        code,
        name,
        description: description === undefined ? null : description,
        order,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description,
    order: created.order,
    created_at:
      typeof created.created_at === "string"
        ? created.created_at
        : toISOStringSafe(created.created_at),
    updated_at:
      typeof created.updated_at === "string"
        ? created.updated_at
        : toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
