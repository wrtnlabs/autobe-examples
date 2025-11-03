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

export async function putShoppingAdminProductTagsTagCode(props: {
  admin: AdminPayload;
  tagCode: string;
  body: IShoppingProductTag.IUpdate;
}): Promise<IShoppingProductTag> {
  const { admin, tagCode, body } = props;
  // Authorization param (admin) is consumed for contract purposes only (actual check handled upstream)
  // Step 1: Lookup tag by its unique code
  const tag = await MyGlobal.prisma.shopping_product_tags.findUnique({
    where: { tag_code: tagCode },
  });
  if (!tag) {
    throw new HttpException("Product tag not found", 404);
  }
  // Step 2: Attempt to update allowed fields only
  try {
    const updated = await MyGlobal.prisma.shopping_product_tags.update({
      where: { tag_code: tagCode },
      data: {
        display_value: body.display_value ?? undefined,
        description: body.description ?? undefined,
      },
    });
    return {
      id: updated.id,
      tag_code: updated.tag_code,
      display_value: updated.display_value,
      description: updated.description ?? undefined,
      created_at: toISOStringSafe(updated.created_at),
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("display_value or tag_code must be unique", 409);
    }
    throw err;
  }
}
