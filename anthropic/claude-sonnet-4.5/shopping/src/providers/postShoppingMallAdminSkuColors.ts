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

export async function postShoppingMallAdminSkuColors(props: {
  admin: AdminPayload;
  body: IShoppingMallSkuColor.ICreate;
}): Promise<IShoppingMallSkuColor> {
  const { body } = props;

  try {
    const created = await MyGlobal.prisma.shopping_mall_sku_colors.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        name: body.name,
        created_at: toISOStringSafe(new Date()),
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      name: created.name,
      hex_code: created.hex_code === null ? undefined : created.hex_code,
      created_at: toISOStringSafe(created.created_at),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException("A color with this name already exists", 409);
      }
    }
    throw new HttpException("Failed to create SKU color", 500);
  }
}
