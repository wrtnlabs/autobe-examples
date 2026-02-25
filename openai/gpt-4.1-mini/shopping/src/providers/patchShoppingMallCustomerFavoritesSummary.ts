import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleFavorite";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerFavoritesSummary(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleFavorite.IRequest;
}): Promise<IPageIShoppingMallSaleFavorite.ISummary> {
  // Helper to safely convert Date to 'string & tags.Format<"date-time">', non-null
  function toDateTimeString(
    value: Date | null | undefined,
  ): string & tags.Format<"date-time"> {
    return (
      toISOStringSafe(value ?? new Date()) ||
      ("" as string & tags.Format<"date-time">)
    );
  }
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  const sortField = props.body.sort ?? "created_at";
  const orderBy = { [sortField]: "desc" } as const;
  const whereConditions: Prisma.shopping_mall_sale_favoritesWhereInput = {
    deleted_at: null,
    shopping_mall_customer_id: props.customer.id,
    ...(props.body.saleId && { shopping_mall_sale_id: props.body.saleId }),
    ...(props.body.search && {
      sale: {
        name: { contains: props.body.search, mode: "insensitive" },
        deleted_at: null,
      },
    }),
  };
  const favorites = await MyGlobal.prisma.shopping_mall_sale_favorites.findMany(
    {
      where: whereConditions,
      skip,
      take: limit,
      orderBy: orderBy,
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
          },
        },
        sale: {
          select: {
            id: true,
            name: true,
            base_price: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            seller: {
              select: {
                id: true,
                email: true,
                shop_name: true,
                shop_description: true,
                logo_uri: true,
                approval_status: true,
                rejection_reason: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_sale_favorites.count({
    where: whereConditions,
  });
  const data: IShoppingMallSaleFavorite.ISummary[] = favorites.map((fav) => ({
    id: fav.id,
    createdAt: toDateTimeString(fav.created_at),
    updatedAt: toDateTimeString(fav.updated_at),
    deletedAt: toDateTimeString(fav.deleted_at),
    customer: {
      id: fav.customer.id,
      email: fav.customer.email,
      displayName: fav.customer.display_name ?? null,
      phoneNumber: fav.customer.phone_number ?? null,
      createdAt: toDateTimeString(fav.customer.created_at),
      updatedAt: toDateTimeString(fav.customer.updated_at),
    },
    sale: {
      id: fav.sale.id,
      name: fav.sale.name,
      basePrice: fav.sale.base_price,
      status: fav.sale.status,
      createdAt: toDateTimeString(fav.sale.created_at),
      updatedAt: toDateTimeString(fav.sale.updated_at),
      deletedAt: toDateTimeString(fav.sale.deleted_at),
      seller: {
        id: fav.sale.seller.id,
        email: fav.sale.seller.email,
        shopName: fav.sale.seller.shop_name,
        shopDescription: fav.sale.seller.shop_description ?? null,
        logoUri: fav.sale.seller.logo_uri ?? null,
        approvalStatus: fav.sale.seller.approval_status,
        rejectionReason: fav.sale.seller.rejection_reason ?? null,
      },
      category: {
        id: fav.sale.category.id,
        name: fav.sale.category.name,
        description: fav.sale.category.description,
        created_at: toDateTimeString(fav.sale.category.created_at),
        updated_at: toDateTimeString(fav.sale.category.updated_at),
        deleted_at: toDateTimeString(fav.sale.category.deleted_at),
      },
    },
  }));
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: pages,
    },
    data,
  };
}
