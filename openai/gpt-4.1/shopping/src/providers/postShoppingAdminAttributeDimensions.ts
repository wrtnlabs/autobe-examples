import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminAttributeDimensions(props: {
  admin: AdminPayload;
  body: IShoppingAttributeDimension.ICreate;
}): Promise<IShoppingAttributeDimension> {
  try {
    const created_at = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.shopping_attribute_dimensions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        dimension_code: props.body.dimension_code,
        name: props.body.name,
        description: props.body.description,
        created_at: created_at,
      },
    });
    return {
      id: created.id,
      dimension_code: created.dimension_code,
      name: created.name,
      description: created.description,
      created_at: toISOStringSafe(created.created_at),
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate dimension_code: an attribute dimension with this code already exists.",
        409,
      );
    }
    throw err;
  }
}
