import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerAttributeDimensionsDimensionCode(props: {
  seller: SellerPayload;
  dimensionCode: string;
}): Promise<IShoppingAttributeDimension> {
  const dimension =
    await MyGlobal.prisma.shopping_attribute_dimensions.findUnique({
      where: {
        dimension_code: props.dimensionCode,
      },
    });
  if (!dimension) {
    throw new HttpException("Attribute dimension not found", 404);
  }
  return {
    id: dimension.id,
    dimension_code: dimension.dimension_code,
    name: dimension.name,
    description: dimension.description,
    created_at: toISOStringSafe(dimension.created_at),
  };
}
