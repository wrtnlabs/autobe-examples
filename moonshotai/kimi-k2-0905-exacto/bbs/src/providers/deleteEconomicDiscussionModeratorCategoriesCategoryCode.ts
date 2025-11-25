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

export async function deleteEconomicDiscussionModeratorCategoriesCategoryCode(props: {
  moderator: ModeratorPayload;
  categoryCode: string;
}): Promise<IEconomicDiscussionCategory> {
  // Find the category by its unique code
  const existingCategory =
    await MyGlobal.prisma.economic_discussion_categories.findUnique({
      where: {
        code: props.categoryCode,
      },
    });

  if (!existingCategory) {
    throw new HttpException("Category not found", 404);
  }

  // Perform soft deletion by updating deleted_at and setting inactive
  const deletedCategory =
    await MyGlobal.prisma.economic_discussion_categories.update({
      where: {
        code: props.categoryCode,
      },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        is_active: false,
      },
    });

  // Return the updated category with proper typing for optional fields
  return {
    ...deletedCategory,
    id: deletedCategory.id as string & tags.Format<"uuid">,
    description:
      deletedCategory.description === null
        ? undefined
        : deletedCategory.description,
    deleted_at: toISOStringSafe(deletedCategory.deleted_at as Date),
    created_at: toISOStringSafe(deletedCategory.created_at),
    updated_at: toISOStringSafe(deletedCategory.updated_at),
  } as IEconomicDiscussionCategory;
}
