import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
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

export async function putShoppingMallSellerSalesSaleId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSale.IUpdate;
}): Promise<IShoppingMallSale> {
  // Ensure sale exists, belongs to seller, and is not deleted
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      id: props.saleId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!sale) throw new HttpException("Sale not found or unauthorized", 404);
  // Use transaction for atomic update
  const [updated] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_sales.update({
      where: { id: props.saleId },
      data: {
        updated_at: toISOStringSafe(new Date()),
      },
    }),
  ]);
  // Map result manually, converting Date to ISO string with safe utility
  return {
    id: updated.id,
    seller_id: updated.seller_id,
    category_id: updated.category_id,
    name: updated.name,
    description: updated.description,
    base_price: updated.base_price,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
