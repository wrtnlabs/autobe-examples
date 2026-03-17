import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCategoryAtSummaryTransformer } from "../transformers/ShoppingMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (props.body.isTopLevel === true && props.body.isSubcategory === true)
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  const search: string | undefined =
    props.body.search !== undefined && props.body.search.trim().length !== 0
      ? props.body.search.trim()
      : undefined;
  const whereInput = {
    deleted_at: null,
    ...(search !== undefined
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.parent_id !== undefined
      ? {
          parent_id: props.body.parent_id,
        }
      : {}),
    ...(props.body.parent_id === undefined && props.body.isTopLevel === true
      ? {
          parent_id: null,
        }
      : {}),
    ...(props.body.parent_id === undefined && props.body.isSubcategory === true
      ? {
          parent_id: {
            not: null,
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_categoriesWhereInput;
  const orderByInput: Prisma.shopping_mall_categoriesOrderByWithRelationInput[] =
    props.body.sort === "name" || props.body.sort === "name_asc"
      ? [{ name: "asc" }]
      : props.body.sort === "name_desc"
        ? [{ name: "desc" }]
        : props.body.sort === "created_at" ||
            props.body.sort === "created_at_asc"
          ? [{ created_at: "asc" }]
          : props.body.sort === "created_at_desc"
            ? [{ created_at: "desc" }]
            : props.body.sort === "updated_at" ||
                props.body.sort === "updated_at_asc"
              ? [{ updated_at: "asc" }]
              : props.body.sort === "updated_at_desc"
                ? [{ updated_at: "desc" }]
                : [
                    { parent_id: "asc" },
                    { name: "asc" },
                    { created_at: "asc" },
                  ];
  const data = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      name: true,
      description: true,
      parent: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          name: true,
          description: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_categories.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCategoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
