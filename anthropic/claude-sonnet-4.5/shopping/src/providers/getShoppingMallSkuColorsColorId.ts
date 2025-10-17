import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";

export async function getShoppingMallSkuColorsColorId(props: {
  colorId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSkuColor> {
  const { colorId } = props;

  const color =
    await MyGlobal.prisma.shopping_mall_sku_colors.findUniqueOrThrow({
      where: { id: colorId },
      select: {
        id: true,
        name: true,
        hex_code: true,
        created_at: true,
      },
    });

  return {
    id: color.id as string & tags.Format<"uuid">,
    name: color.name,
    hex_code: color.hex_code === null ? undefined : color.hex_code,
    created_at: toISOStringSafe(color.created_at),
  };
}
