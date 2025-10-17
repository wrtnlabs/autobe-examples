import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminSkuColorsColorId(props: {
  admin: AdminPayload;
  colorId: string & tags.Format<"uuid">;
  body: IShoppingMallSkuColor.IUpdate;
}): Promise<IShoppingMallSkuColor> {
  const { admin, colorId, body } = props;

  try {
    const updated = await MyGlobal.prisma.shopping_mall_sku_colors.update({
      where: { id: colorId },
      data: {
        name: body.name ?? undefined,
      },
    });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      name: updated.name,
      hex_code: updated.hex_code !== null ? updated.hex_code : undefined,
      created_at: toISOStringSafe(updated.created_at),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException("A color with this name already exists", 409);
      }
    }
    throw error;
  }
}
