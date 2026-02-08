import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleFavorite";
import { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSaleFavorites(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleFavorite.IRequest;
}): Promise<IPageIShoppingMallSaleFavorite.ISummary> {
  const page: number =
    typeof (props.body as any).page === "number" && (props.body as any).page > 0
      ? Math.floor((props.body as any).page)
      : 1;
  const limit: number =
    typeof (props.body as any).limit === "number" &&
    (props.body as any).limit > 0
      ? Math.floor((props.body as any).limit)
      : 100;
  const skip: number = (page - 1) * limit;
  const favorites = await MyGlobal.prisma.shopping_mall_sale_favorites.findMany(
    {
      where: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_sale_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sale: {
          select: {
            id: true,
            seller_id: true,
            category_id: true,
            name: true,
            description: true,
            base_price: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_sale_favorites.count({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  const data: IShoppingMallSaleFavorite.ISummary[] = favorites.map((fav) => {
    const sale = fav.sale;
    return {
      id: fav.id,
      shopping_mall_customer_id: fav.shopping_mall_customer_id,
      shopping_mall_sale_id: fav.shopping_mall_sale_id,
      created_at: toISOStringSafe(fav.created_at),
      updated_at: toISOStringSafe(fav.updated_at),
      deleted_at: fav.deleted_at ? toISOStringSafe(fav.deleted_at) : null,
      sale: sale
        ? {
            id: sale.id,
            seller_id: sale.seller_id,
            category_id: sale.category_id,
            name: sale.name,
            description: sale.description,
            base_price: sale.base_price,
            status: sale.status,
            created_at: toISOStringSafe(sale.created_at),
            updated_at: toISOStringSafe(sale.updated_at),
            deleted_at: sale.deleted_at
              ? toISOStringSafe(sale.deleted_at)
              : null,
          }
        : null,
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
