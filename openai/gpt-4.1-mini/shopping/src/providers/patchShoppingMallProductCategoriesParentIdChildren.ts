import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallProductCategoriesParentIdChildren(props: {
  parentId: string & tags.Format<"uuid">;
  body: IShoppingMallProductCategory.IRequest;
}): Promise<IPageIShoppingMallProductCategory.ISummary> {
  const { parentId, body } = props;

  const parentCategory =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: parentId },
      select: { id: true },
    });
  if (!parentCategory) {
    throw new HttpException("Parent product category not found", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "created_at";
  const order = body.order ?? "desc";

  const where = {
    parent_id: parentId,
    ...(body.include_deleted ? {} : { deleted_at: null }),
    ...(body.filter_name !== undefined &&
      body.filter_name !== null && { name: { contains: body.filter_name } }),
    ...(body.filter_description !== undefined &&
      body.filter_description !== null && {
        description: { contains: body.filter_description },
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_categories.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
      select: { id: true, name: true, parent_id: true },
    }),
    MyGlobal.prisma.shopping_mall_product_categories.count({ where }),
  ]);

  const data = results.map((r) => ({
    id: r.id,
    name: r.name,
    parent_id: r.parent_id === null ? null : r.parent_id,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
