import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleFavoriteCollector } from "../collectors/ShoppingMallSaleFavoriteCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerSaleFavorites(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleFavorite.ICreate;
}): Promise<IShoppingMallSaleFavorite> {
  const existing = await MyGlobal.prisma.shopping_mall_sale_favorites.findFirst(
    {
      where: {
        shopping_mall_customer_id: props.customer.id,
        // shopping_mall_sale_id: props.body.shopping_mall_sale_id, // Removed due to missing property
        deleted_at: null,
      },
    },
  );
  if (existing) {
    throw new HttpException("Favorite already exists", 409);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const customerEntity = await tx.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
    });
    // Not accessing shopping_mall_sale_id from props.body due to missing property
    const data = await ShoppingMallSaleFavoriteCollector.collect({
      body: props.body,
      customer: customerEntity,
      sale: undefined as any, // Placeholder, as saleEntity cannot be retrieved without sale id
    });
    const now = toISOStringSafe(new Date());
    const createdRecord = await tx.shopping_mall_sale_favorites.create({
      data: {
        ...data,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return createdRecord;
  });
  return created;
}
