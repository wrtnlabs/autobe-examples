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

export async function patchShoppingMallCustomerSalesFavorites(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleFavorite.IRequest;
}): Promise<IPageIShoppingMallSaleFavorite.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const validSortFields = ["created_at", "updated_at", "deleted_at"] as const;
  const sortField = validSortFields.includes(props.body.sort ?? "created_at")
    ? (props.body.sort ?? "created_at")
    : "created_at";
  const where: Prisma.shopping_mall_sale_favoritesWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
  };
  if (props.body.saleId) {
    where.shopping_mall_sale_id = props.body.saleId;
  }
  if (props.body.search) {
    where.sale = {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
      deleted_at: null,
    };
  }
  const data = await MyGlobal.prisma.shopping_mall_sale_favorites.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sortField]: "desc" },
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
              approval_status: true,
              created_at: true,
              updated_at: true,
            },
          },
          category: {
            select: {
              id: true,
              description: true,
              name: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_favorites.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((favorite) => ({
      id: favorite.id,
      createdAt: toISOStringSafe(favorite.created_at) as unknown as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(favorite.updated_at) as unknown as string &
        tags.Format<"date-time">,
      deletedAt:
        favorite.deleted_at === null
          ? null
          : (toISOStringSafe(favorite.deleted_at) as unknown as string &
              tags.Format<"date-time">),
      customer: {
        id: favorite.customer.id,
        email: favorite.customer.email,
        displayName: favorite.customer.display_name ?? null,
        phoneNumber: favorite.customer.phone_number ?? null,
        createdAt: toISOStringSafe(
          favorite.customer.created_at,
        ) as unknown as string & tags.Format<"date-time">,
        updatedAt: toISOStringSafe(
          favorite.customer.updated_at,
        ) as unknown as string & tags.Format<"date-time">,
      } satisfies IShoppingMallCustomer.ISummary,
      sale: {
        id: favorite.sale.id,
        name: favorite.sale.name,
        basePrice: favorite.sale.base_price,
        status: favorite.sale.status,
        createdAt: toISOStringSafe(
          favorite.sale.created_at,
        ) as unknown as string & tags.Format<"date-time">,
        updatedAt: toISOStringSafe(
          favorite.sale.updated_at,
        ) as unknown as string & tags.Format<"date-time">,
        deletedAt:
          favorite.sale.deleted_at === null
            ? null
            : (toISOStringSafe(favorite.sale.deleted_at) as unknown as string &
                tags.Format<"date-time">),
        seller: {
          id: favorite.sale.seller.id,
          email: favorite.sale.seller.email,
          shopName: favorite.sale.seller.shop_name ?? null,
          approvalStatus: favorite.sale.seller.approval_status,
          createdAt: toISOStringSafe(
            favorite.sale.seller.created_at,
          ) as unknown as string & tags.Format<"date-time">,
          updatedAt: toISOStringSafe(
            favorite.sale.seller.updated_at,
          ) as unknown as string & tags.Format<"date-time">,
        } satisfies IShoppingMallSeller.ISummary,
        category: {
          id: favorite.sale.category.id,
          description: favorite.sale.category.description ?? null,
          name: favorite.sale.category.name,
          createdAt: toISOStringSafe(
            favorite.sale.category.created_at,
          ) as unknown as string & tags.Format<"date-time">,
          updatedAt: toISOStringSafe(
            favorite.sale.category.updated_at,
          ) as unknown as string & tags.Format<"date-time">,
          deletedAt:
            favorite.sale.category.deleted_at === null
              ? null
              : (toISOStringSafe(
                  favorite.sale.category.deleted_at,
                ) as unknown as string & tags.Format<"date-time">),
        } satisfies IShoppingMallProductCategory.ISummary,
      } satisfies IShoppingMallSale.ISummary,
    })),
  };
}
