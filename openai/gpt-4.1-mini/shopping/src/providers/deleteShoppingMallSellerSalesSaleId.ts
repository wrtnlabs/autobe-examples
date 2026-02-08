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

export async function deleteShoppingMallSellerSalesSaleId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.saleId },
    select: { id: true, seller_id: true },
  });
  if (sale === null) {
    throw new HttpException("Sale not found", 404);
  }
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_sales.delete({
    where: { id: props.saleId },
  });
}
