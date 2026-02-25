import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleFavoriteCollector } from "../collectors/ShoppingMallSaleFavoriteCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSaleFavoriteTransformer } from "../transformers/ShoppingMallSaleFavoriteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerSalesFavorites(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleFavorite.ICreate;
}): Promise<IShoppingMallSaleFavorite> {
  const customerId = props.customer.id;
  const saleId = props.body.shoppingMallSaleId;
  // Verify sale exists and is available (not soft deleted)
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: saleId },
    select: { id: true },
  });
  if (!sale) {
    throw new HttpException("Invalid saleId: sale not found", 400);
  }
  // Check for existing favorite to prevent duplicates
  const existingFavorite =
    await MyGlobal.prisma.shopping_mall_sale_favorites.findUnique({
      where: {
        shopping_mall_customer_id_shopping_mall_sale_id: {
          shopping_mall_customer_id: customerId,
          shopping_mall_sale_id: saleId,
        },
      },
    });
  if (existingFavorite) {
    throw new HttpException("Sale is already in favorites", 400);
  }
  // Collect creation data
  const createData = await ShoppingMallSaleFavoriteCollector.collect({
    body: props.body,
    customer: { id: customerId },
    sale: { id: saleId },
  });
  // Create new favorite record
  const createdRecord =
    await MyGlobal.prisma.shopping_mall_sale_favorites.create({
      data: createData,
      ...ShoppingMallSaleFavoriteTransformer.select(),
    });
  // Transform and return the newly created favorite
  return await ShoppingMallSaleFavoriteTransformer.transform(createdRecord);
}
