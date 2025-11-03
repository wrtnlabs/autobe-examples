import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductTag";

export async function getShoppingProductTagsTagCode(props: {
  tagCode: string;
}): Promise<IShoppingProductTag> {
  const tag = await MyGlobal.prisma.shopping_product_tags.findUnique({
    where: { tag_code: props.tagCode },
  });
  if (!tag) throw new HttpException("Product tag not found", 404);

  return {
    id: tag.id,
    tag_code: tag.tag_code,
    display_value: tag.display_value,
    // description is optional and nullable in DB, so only provide if not null
    description: tag.description === null ? undefined : tag.description,
    created_at: toISOStringSafe(tag.created_at),
  };
}
