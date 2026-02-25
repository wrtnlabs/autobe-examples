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
import { ShoppingMallSaleAtSummaryTransformer } from "../transformers/ShoppingMallSaleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerReportsSales(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSale.ISummary[]> {
  try {
    const sales = await MyGlobal.prisma.shopping_mall_sales.findMany({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: ShoppingMallSaleAtSummaryTransformer.select().select,
    });
    const result = await Promise.all(
      sales.map(ShoppingMallSaleAtSummaryTransformer.transform),
    );
    return result;
  } catch (error) {
    console.error("Failed to fetch seller sales report:", error);
    throw new HttpException("Failed to fetch sales report", 500);
  }
}
