import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteSeller";
import { IPageIShoppingMallFavoriteSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavoriteSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallFavoriteSellers(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavoriteSeller.IRequest;
}): Promise<IPageIShoppingMallFavoriteSeller.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  const whereCondition: Prisma.shopping_mall_favorite_sellersWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    seller: {
      deleted_at: null,
      ...(props.body.search !== undefined
        ? {
            OR: [
              {
                name: { contains: props.body.search, mode: "insensitive" },
              },
            ],
          }
        : {}),
    },
  };

  const orderByCondition =
    props.body.order_by === "seller_name"
      ? { seller: { name: props.body.order_direction ?? "asc" } }
      : { created_at: props.body.order_direction ?? "desc" };

  const [totalCount, favoriteSellers] = await Promise.all([
    MyGlobal.prisma.shopping_mall_favorite_sellers.count({
      where: whereCondition,
    }),
    MyGlobal.prisma.shopping_mall_favorite_sellers.findMany({
      where: whereCondition,
      orderBy: orderByCondition,
      skip,
      take: limit,
      include: { seller: true },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data: favoriteSellers.map((item) => ({
      id: item.id,
      sellerId: item.shopping_mall_seller_id,
      sellerName: item.seller.name,
      sellerRating: 0,
      addedAt: toISOStringSafe(item.created_at),
    })),
  };
}
