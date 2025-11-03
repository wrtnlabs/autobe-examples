import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putPoliticsBbsModeratorCategoriesCategoryCode(props: {
  moderator: ModeratorPayload;
  categoryCode: string;
  body: IPoliticsBbsCategory.IUpdate;
}): Promise<IPoliticsBbsCategory> {
  // Find the category by code
  const category = await MyGlobal.prisma.politics_bbs_categories.findFirst({
    where: {
      code: props.categoryCode,
      deleted_at: null,
    },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // Build update data inline for Prisma
  const updated = await MyGlobal.prisma.politics_bbs_categories.update({
    where: { id: category.id },
    data: {
      // Only update fields that were provided
      ...(props.body.code !== undefined && { code: props.body.code }),
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.color !== undefined && { color: props.body.color }),
      ...(props.body.icon !== undefined && { icon: props.body.icon }),
      ...(props.body.sequence !== undefined && {
        sequence: props.body.sequence,
      }),
      ...(props.body.primary !== undefined && { primary: props.body.primary }),
      ...(props.body.required !== undefined && {
        required: props.body.required,
      }),
      ...(props.body.multiplicative !== undefined && {
        multiplicative: props.body.multiplicative,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated category with proper type mapping
  return {
    id: updated.id as string & tags.Format<"uuid">,
    code: updated.code,
    name: updated.name,
    description: updated.description,
    color: updated.color === null ? undefined : updated.color,
    icon: updated.icon === null ? undefined : updated.icon,
    sequence: updated.sequence,
    primary: updated.primary,
    required: updated.required,
    multiplicative: updated.multiplicative,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
