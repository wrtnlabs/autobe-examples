import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IPageIShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductsCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdCategories(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductsCategory.IRequest;
}): Promise<IPageIShoppingMallProductsCategory.ISummary> {
  const { productId, body } = props;

  // 1. Verify product exists and is not soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId, deleted_at: null },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or deleted", 404);
  }

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;
  const search = body.search;

  // Prepare orderBy
  let orderBy: any = undefined;
  if (body.sort === "category_name") {
    orderBy = {
      category: {
        name: body.order ?? "asc",
      },
    };
  } else {
    orderBy = {
      created_at: body.order ?? "asc",
    };
  }

  // Compose Prisma "where" filter
  let where: any = {
    shopping_mall_product_id: productId,
  };
  if (search) {
    where = {
      ...where,
      category: {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
    };
  }

  // Fetch filtered (search-aware) records/count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products_categories.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_products_categories.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((rec) => ({
      id: rec.category.id,
      name: rec.category.name,
    })),
  };
}
