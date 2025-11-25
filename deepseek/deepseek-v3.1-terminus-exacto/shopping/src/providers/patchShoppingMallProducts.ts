import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;

  // Build where conditions using object spread for clarity
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.category_id && {
      shopping_mall_category_id: props.body.category_id,
    }),
    ...(props.body.seller_id && {
      shopping_mall_seller_id: props.body.seller_id,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.condition && { condition: props.body.condition }),
    ...(props.body.dimensions && {
      dimensions: { contains: props.body.dimensions },
    }),
    ...((props.body.min_price !== undefined ||
      props.body.max_price !== undefined) && {
      price: {
        ...(props.body.min_price !== undefined && {
          gte: props.body.min_price,
        }),
        ...(props.body.max_price !== undefined && {
          lte: props.body.max_price,
        }),
      },
    }),
    ...((props.body.weight_min !== undefined ||
      props.body.weight_max !== undefined) && {
      weight: {
        ...(props.body.weight_min !== undefined && {
          gte: props.body.weight_min,
        }),
        ...(props.body.weight_max !== undefined && {
          lte: props.body.weight_max,
        }),
      },
    }),
    ...(props.body.in_stock !== undefined && {
      stock_quantity: props.body.in_stock ? { gt: 0 } : { lte: 0 },
    }),
  };

  // Build orderBy
  const sortFieldMap: Record<string, string> = {
    price: "price",
    created_at: "created_at",
    name: "name",
    popularity: "created_at", // Default to created_at for popularity
  };

  const sortField = props.body.sort_by
    ? (sortFieldMap[props.body.sort_by] ?? "created_at")
    : "created_at";
  const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";

  const orderBy = { [sortField]: sortOrder };

  try {
    // Execute queries concurrently
    const [products, total] = await Promise.all([
      MyGlobal.prisma.shopping_mall_products.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          seller: true,
        },
      }),
      MyGlobal.prisma.shopping_mall_products.count({ where }),
    ]);

    // Transform to summary format
    const data = products.map((product) => ({
      id: product.id as string & tags.Format<"uuid">,
      name: product.name,
      price: product.price,
      status: product.status,
      stock_quantity: product.stock_quantity as number & tags.Type<"int32">,
      category: {
        id: product.category.id as string & tags.Format<"uuid">,
        name: product.category.name,
        description: product.category.description ?? undefined,
        display_order: product.category.display_order,
        active: product.category.active,
        parent_id: product.category.parent_id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(product.category.created_at),
        updated_at: toISOStringSafe(product.category.updated_at),
        parent: undefined,
      },
      seller: {
        id: product.seller.id as string & tags.Format<"uuid">,
        business_name: product.seller.business_name,
        contact_person: product.seller.contact_person,
        email: product.seller.email as string & tags.Format<"email">,
        status: product.seller.status,
      },
    }));

    return {
      pagination: {
        current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: Math.ceil(total / limit) as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      },
      data,
    };
  } catch (error) {
    throw new HttpException("Failed to search products", 500);
  }
}
