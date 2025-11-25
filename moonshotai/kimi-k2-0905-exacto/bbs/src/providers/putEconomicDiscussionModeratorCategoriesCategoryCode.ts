import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putEconomicDiscussionModeratorCategoriesCategoryCode(props: {
  moderator: ModeratorPayload;
  categoryCode: string;
  body: IEconomicDiscussionCategory.IUpdate;
}): Promise<IEconomicDiscussionCategory> {
  // Find the category by code, ensuring it's not soft deleted
  const existingCategory =
    await MyGlobal.prisma.economic_discussion_categories.findFirst({
      where: {
        code: props.categoryCode,
        deleted_at: null,
      },
    });

  if (!existingCategory) {
    throw new HttpException("Category not found", 404);
  }

  const updatedCategory =
    await MyGlobal.prisma.economic_discussion_categories.update({
      where: { id: existingCategory.id },
      data: {
        name: props.body.name ?? existingCategory.name,
        description: props.body.description ?? existingCategory.description,
        display_order:
          props.body.display_order ?? existingCategory.display_order,
        is_active: props.body.is_active ?? existingCategory.is_active,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updatedCategory.id,
    code: updatedCategory.code,
    name: updatedCategory.name,
    description:
      updatedCategory.description === null
        ? undefined
        : updatedCategory.description,
    display_order: updatedCategory.display_order,
    is_active: updatedCategory.is_active,
    article_count: updatedCategory.article_count,
    created_at: toISOStringSafe(updatedCategory.created_at),
    updated_at: toISOStringSafe(updatedCategory.updated_at),
    deleted_at: updatedCategory.deleted_at
      ? toISOStringSafe(updatedCategory.deleted_at)
      : undefined,
  };
}
