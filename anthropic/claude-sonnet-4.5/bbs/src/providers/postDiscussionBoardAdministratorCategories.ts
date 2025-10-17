import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postDiscussionBoardAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardCategory.ICreate;
}): Promise<IDiscussionBoardCategory> {
  const { administrator, body } = props;

  // Validate parent category exists and is active if provided
  if (
    body.parent_category_id !== undefined &&
    body.parent_category_id !== null
  ) {
    const parentCategory =
      await MyGlobal.prisma.discussion_board_categories.findFirst({
        where: {
          id: body.parent_category_id,
          is_active: true,
          deleted_at: null,
        },
      });

    if (!parentCategory) {
      throw new HttpException("Parent category not found or inactive", 404);
    }
  }

  // Check name uniqueness
  const existingName =
    await MyGlobal.prisma.discussion_board_categories.findFirst({
      where: {
        name: body.name,
        deleted_at: null,
      },
    });

  if (existingName) {
    throw new HttpException("Category name already exists", 409);
  }

  // Check slug uniqueness
  const existingSlug =
    await MyGlobal.prisma.discussion_board_categories.findFirst({
      where: {
        slug: body.slug,
        deleted_at: null,
      },
    });

  if (existingSlug) {
    throw new HttpException("Category slug already exists", 409);
  }

  // Create the category
  const now = toISOStringSafe(new Date());
  const newCategoryId = v4();

  const created = await MyGlobal.prisma.discussion_board_categories.create({
    data: {
      id: newCategoryId,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      parent_category_id: body.parent_category_id ?? null,
      display_order: body.display_order,
      is_active: body.is_active,
      topic_count: 0,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    slug: created.slug,
    description: created.description,
    parent_category_id: created.parent_category_id as
      | (string & tags.Format<"uuid">)
      | null,
    display_order: created.display_order,
    is_active: created.is_active,
    topic_count: created.topic_count,
    created_at: now,
    updated_at: now,
  };
}
