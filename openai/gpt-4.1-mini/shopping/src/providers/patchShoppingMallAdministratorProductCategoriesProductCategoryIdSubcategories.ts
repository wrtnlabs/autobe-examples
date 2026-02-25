import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSubcategory";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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

export async function patchShoppingMallAdministratorProductCategoriesProductCategoryIdSubcategories(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSubcategory.IRequest;
}): Promise<IPageIShoppingMallProductSubcategory.ISummary> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_product_categories.findUniqueOrThrow({
      where: { id: props.productCategoryId },
      select: { id: true },
    });
    const page = (props.body.page ?? 1) >= 1 ? (props.body.page ?? 1) : 1;
    const limit =
      (props.body.limit ?? 20) >= 1 && (props.body.limit ?? 20) <= 100
        ? (props.body.limit ?? 20)
        : 20;
    const skip = (page - 1) * limit;
    const baseFilter: Prisma.shopping_mall_product_subcategoriesWhereInput = {
      shopping_mall_product_category_id: props.productCategoryId,
    };
    if (props.body.search) {
      baseFilter.OR = [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ];
    }
    if (props.body.name) {
      baseFilter.name = props.body.name;
    }
    if (props.body.description !== undefined) {
      if (props.body.description === null) {
        baseFilter.description = {
          equals: null,
        } satisfies Prisma.StringNullableFilter;
      } else {
        baseFilter.description = props.body.description;
      }
    }
    const totalCount = await tx.shopping_mall_product_subcategories.count({
      where: baseFilter,
    });
    const rows = await tx.shopping_mall_product_subcategories.findMany({
      where: baseFilter,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
    });
    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      createdAt: toISOStringSafe(r.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(r.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: r.deleted_at
        ? (toISOStringSafe(r.deleted_at) as string & tags.Format<"date-time">)
        : null,
      category: {
        id: r.category.id,
        name: r.category.name,
        description: r.category.description,
        created_at: toISOStringSafe(r.category.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(r.category.updated_at) as string &
          tags.Format<"date-time">,
        deleted_at: r.category.deleted_at
          ? (toISOStringSafe(r.category.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      } satisfies IShoppingMallProductCategory.ISummary,
    }));
    return {
      pagination: {
        current: page as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: limit as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        records: totalCount as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: Math.ceil(totalCount / limit) as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      },
      data,
    } satisfies IPageIShoppingMallProductSubcategory.ISummary;
  });
}
