import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleTransformer } from "../transformers/ShoppingMallSaleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerSalesSaleId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSale.IUpdate;
}): Promise<IShoppingMallSale> {
  // Find the sale by ID and verify existence
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
    select: { id: true, seller_id: true },
  });
  // Check authorization
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this sale.", 403);
  }
  // Construct update data immutably
  const updateData = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.category_id !== undefined && {
      category_id: props.body.category_id,
    }),
    ...(props.body.base_price !== undefined && {
      base_price: props.body.base_price,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  // Update the sale
  await MyGlobal.prisma.shopping_mall_sales.update({
    where: { id: props.saleId },
    data: updateData,
  });
  // Retrieve the updated record with transformer
  const updatedRecord =
    await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
      where: { id: props.saleId },
      ...ShoppingMallSaleTransformer.select(),
    });
  return await ShoppingMallSaleTransformer.transform(updatedRecord);
}
