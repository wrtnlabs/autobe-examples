import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSubcategory";
import { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorProductCategoriesCategoryIdSubcategories(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSubcategory.IRequest;
}): Promise<IPageIShoppingMallProductSubcategory.ISummary> {
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: props.categoryId },
      select: { id: true },
    });
  if (!category) {
    throw new HttpException("Product category not found", 404);
  }
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.shopping_mall_product_subcategoriesWhereInput = {
    shopping_mall_product_category_id: props.categoryId,
    deleted_at: null,
  };
  const data =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_product_subcategories.count(
    {
      where: whereClause,
    },
  );
  return {
    data: data.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
  };
}
