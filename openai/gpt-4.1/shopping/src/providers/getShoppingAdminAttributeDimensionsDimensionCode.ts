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

export async function getShoppingAdminAttributeDimensionsDimensionCode(props: {
  admin: AdminPayload;
  dimensionCode: string;
}): Promise<IShoppingAttributeDimension> {
  const record = await MyGlobal.prisma.shopping_attribute_dimensions.findFirst({
    where: {
      dimension_code: props.dimensionCode,
    },
    select: {
      id: true,
      dimension_code: true,
      name: true,
      description: true,
      created_at: true,
    },
  });
  if (!record) {
    throw new HttpException("Attribute dimension not found", 404);
  }
  return {
    id: record.id,
    dimension_code: record.dimension_code,
    name: record.name,
    description: record.description,
    created_at: toISOStringSafe(record.created_at),
  };
}
