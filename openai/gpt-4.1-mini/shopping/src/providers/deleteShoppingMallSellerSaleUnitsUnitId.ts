import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerSaleUnitsUnitId(props: {
  seller: SellerPayload;
  unitId: string & tags.Format<"uuid">;
}): Promise<void> {
  const saleUnit = await MyGlobal.prisma.shopping_mall_sale_units.findUnique({
    where: { id: props.unitId },
    select: {
      id: true,
      shopping_mall_sale_id: true,
      sale: {
        select: { id: true, seller_id: true },
      },
    },
  });
  if (!saleUnit) {
    throw new HttpException("Sale unit not found", 404);
  }
  if (saleUnit.sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_sale_units.delete({
    where: { id: props.unitId },
  });
}
