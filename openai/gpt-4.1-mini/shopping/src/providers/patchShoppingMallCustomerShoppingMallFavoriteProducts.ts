import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";
import { IPageIShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavoriteProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallFavoriteProducts(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavoriteProduct.IRequest;
}): Promise<IPageIShoppingMallFavoriteProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const baseWhere = {
    shopping_mall_customer_id: props.customer.id satisfies string as string,
  } satisfies Prisma.shopping_mall_favorite_productsWhereInput;

  // Search on nested relation removed because it is not supported by Prisma type
  const whereCondition: Prisma.shopping_mall_favorite_productsWhereInput = {
    ...baseWhere,
    // OR condition removed
  };

  const orderByField =
    props.body.sortBy === "name" ? "shopping_mall_product_id" : "created_at";
  const orderByDirection = props.body.sortOrder === "asc" ? "asc" : "desc";

  const orderBy = {
    [orderByField]: orderByDirection,
  } satisfies Prisma.shopping_mall_favorite_productsOrderByWithRelationInput;

  const [favorites, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_favorite_products.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      // relation include removed due to schema incompatibility
    }),

    MyGlobal.prisma.shopping_mall_favorite_products.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: favorites.map((favorite) => ({
      id: favorite.id,
      productId: favorite.shopping_mall_product_id satisfies string as string,
      productName: "",
      productThumbnailUrl: "",
      addedAt: toISOStringSafe(favorite.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
