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

export async function putShoppingAdminAttributeDimensionsDimensionCode(props: {
  admin: AdminPayload;
  dimensionCode: string;
  body: IShoppingAttributeDimension.IUpdate;
}): Promise<IShoppingAttributeDimension> {
  const existing =
    await MyGlobal.prisma.shopping_attribute_dimensions.findUnique({
      where: { dimension_code: props.dimensionCode },
    });
  if (!existing) {
    throw new HttpException("Attribute dimension not found", 404);
  }
  const updated = await MyGlobal.prisma.shopping_attribute_dimensions.update({
    where: { dimension_code: props.dimensionCode },
    data: {
      name: props.body.name,
      description: props.body.description,
      // updated_at removed; not allowed by schema
    },
  });
  return {
    id: updated.id,
    dimension_code: updated.dimension_code,
    name: updated.name,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
  };
}
