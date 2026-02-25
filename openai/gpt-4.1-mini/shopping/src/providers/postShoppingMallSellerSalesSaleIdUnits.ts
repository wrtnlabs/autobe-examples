import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleUnitCollector } from "../collectors/ShoppingMallSaleUnitCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleUnitTransformer } from "../transformers/ShoppingMallSaleUnitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSalesSaleIdUnits(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleUnit.ICreate;
}): Promise<IShoppingMallSaleUnit> {
  // Validate existence and ownership of the sale
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
    select: { id: true, seller_id: true },
  });
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Collect data for creation using the collector
  const data = await ShoppingMallSaleUnitCollector.collect({
    body: props.body,
    sale: { id: sale.id } as const,
  });
  try {
    const created = await MyGlobal.prisma.shopping_mall_sale_units.create({
      data,
      ...ShoppingMallSaleUnitTransformer.select(),
    });
    // Transform the created data for response
    return await ShoppingMallSaleUnitTransformer.transform(created);
  } catch (error) {
    // Handle unique constraint violation for SKU code per sale
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      (error.meta?.target as readonly string[] | undefined)?.includes(
        "shopping_mall_sale_id",
      ) &&
      (error.meta?.target as readonly string[] | undefined)?.includes(
        "sku_code",
      )
    ) {
      throw new HttpException("SKU code must be unique per sale", 400);
    }
    throw error;
  }
}
