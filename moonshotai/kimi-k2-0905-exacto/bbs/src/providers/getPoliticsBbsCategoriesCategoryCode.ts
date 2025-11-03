import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";

export async function getPoliticsBbsCategoriesCategoryCode(props: {
  categoryCode: string;
}): Promise<IPoliticsBbsCategory> {
  const category = await MyGlobal.prisma.politics_bbs_categories.findFirst({
    where: {
      code: props.categoryCode,
      deleted_at: null,
    },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  return {
    id: v4() as string & tags.Format<"uuid">,
    code: category.code,
    name: category.name,
    description: category.description,
    color: category.color ? category.color : undefined,
    icon: category.icon ? category.icon : undefined,
    sequence: category.sequence,
    primary: category.primary,
    required: category.required,
    multiplicative: category.multiplicative,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : undefined,
  };
}
