import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const { body } = props;

  // Extract and normalize page number (default to 0, handle negative)
  const pageInput = body.page ?? 0;
  const page = Math.max(0, Number(pageInput));

  // Set pagination parameters
  const limit = 20;
  const skip = page * limit;

  // Execute parallel queries for products and total count
  const [products, totalRecords] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where: {
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_products.count({
      where: {
        status: "active",
        deleted_at: null,
      },
    }),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalRecords / limit);

  // Map products to summary format
  const data = products.map((product) => ({
    id: product.id as string & tags.Format<"uuid">,
    name: product.name,
  }));

  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    },
    data: data,
  };
}
