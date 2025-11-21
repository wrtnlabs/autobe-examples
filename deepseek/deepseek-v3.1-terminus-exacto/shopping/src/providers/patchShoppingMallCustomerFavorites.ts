import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavorite";
import { IPageIShoppingMallFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavorite";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerFavorites(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavorite.IRequest;
}): Promise<IPageIShoppingMallFavorite.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition for favorites query
  const whereCondition: Prisma.shopping_mall_favoritesWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
  };

  // Add date range filtering using ISO strings directly
  if (props.body.date_from || props.body.date_to) {
    whereCondition.favorited_at = {};
    if (props.body.date_from) {
      whereCondition.favorited_at.gte = props.body.date_from;
    }
    if (props.body.date_to) {
      whereCondition.favorited_at.lte = props.body.date_to;
    }
  }

  // Build product join condition for category and search filtering
  const productWhereCondition: Prisma.shopping_mall_productsWhereInput = {};

  if (props.body.category_ids && props.body.category_ids.length > 0) {
    productWhereCondition.shopping_mall_category_id = {
      in: props.body.category_ids,
    };
  }

  if (props.body.search) {
    productWhereCondition.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Add product condition to where clause
  if (Object.keys(productWhereCondition).length > 0) {
    whereCondition.product = productWhereCondition;
  }

  // Build orderBy based on sort_by parameter
  let orderBy: Prisma.shopping_mall_favoritesOrderByWithRelationInput = {};
  switch (props.body.sort_by) {
    case "product_name":
      orderBy = { product: { name: props.body.order ?? "asc" } };
      break;
    case "product_price":
      orderBy = { product: { price: props.body.order ?? "asc" } };
      break;
    case "favorited_at":
    default:
      orderBy = { favorited_at: props.body.order ?? "desc" };
      break;
  }

  const [favorites, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_favorites.findMany({
      where: whereCondition,
      include: {
        product: {
          include: {
            category: {
              include: {
                parent: true,
              },
            },
            seller: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_favorites.count({
      where: whereCondition,
    }),
  ]);

  // Transform results to match DTO structure
  const data: IShoppingMallFavorite.ISummary[] = favorites.map((favorite) => {
    const product = favorite.product;
    const category = product.category;
    const seller = product.seller;

    return {
      id: favorite.id as string & tags.Format<"uuid">,
      favorited_at: toISOStringSafe(favorite.favorited_at),
      updated_at: favorite.updated_at
        ? toISOStringSafe(favorite.updated_at)
        : undefined,
      product: {
        id: product.id as string & tags.Format<"uuid">,
        name: product.name,
        price: product.price,
        status: product.status,
        stock_quantity: product.stock_quantity,
        category: {
          id: category.id as string & tags.Format<"uuid">,
          name: category.name,
          description: category.description ?? undefined,
          display_order: category.display_order,
          active: category.active,
          parent_id: category.parent_id as string & tags.Format<"uuid">,
          created_at: toISOStringSafe(category.created_at),
          updated_at: toISOStringSafe(category.updated_at),
          parent: category.parent
            ? {
                id: category.parent.id as string & tags.Format<"uuid">,
                name: category.parent.name,
                description: category.parent.description ?? undefined,
                display_order: category.parent.display_order,
                active: category.parent.active,
                parent_id: category.parent.parent_id as string &
                  tags.Format<"uuid">,
                created_at: toISOStringSafe(category.parent.created_at),
                updated_at: toISOStringSafe(category.parent.updated_at),
                parent: undefined,
              }
            : undefined,
        },
        seller: {
          id: seller.id as string & tags.Format<"uuid">,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email as string & tags.Format<"email">,
          status: seller.status,
        },
      },
    };
  });

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
