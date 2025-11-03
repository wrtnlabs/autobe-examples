import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminProductTags(props: {
  admin: AdminPayload;
  body: IShoppingProductTag.ICreate;
}): Promise<IShoppingProductTag> {
  const { tag_code, display_value, description } = props.body;

  // Uniqueness check for tag_code
  const exist = await MyGlobal.prisma.shopping_product_tags.findFirst({
    where: { tag_code },
  });
  if (exist) {
    throw new HttpException(
      `Product tag with tag_code '${tag_code}' already exists`,
      409,
    );
  }

  const now = toISOStringSafe(new Date());
  const id = v4();

  const created = await MyGlobal.prisma.shopping_product_tags.create({
    data: {
      id,
      tag_code,
      display_value,
      description,
      created_at: now,
    },
  });

  return {
    id: created.id,
    tag_code: created.tag_code,
    display_value: created.display_value,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
  };
}
