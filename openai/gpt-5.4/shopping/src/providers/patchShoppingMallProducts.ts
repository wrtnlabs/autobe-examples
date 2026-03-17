import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (props.body.category_id !== undefined) {
    await MyGlobal.prisma.shopping_mall_categories.findFirstOrThrow({
      where: {
        id: props.body.category_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  const orderBy: Prisma.shopping_mall_productsOrderByWithRelationInput[] =
    props.body.sort === "created_at_asc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "created_at_desc" || props.body.sort === undefined
        ? [{ created_at: "desc" }, { id: "desc" }]
        : props.body.sort === "updated_at_asc"
          ? [{ updated_at: "asc" }, { id: "asc" }]
          : props.body.sort === "updated_at_desc"
            ? [{ updated_at: "desc" }, { id: "desc" }]
            : props.body.sort === "name_asc"
              ? [{ name: "asc" }, { id: "asc" }]
              : props.body.sort === "name_desc"
                ? [{ name: "desc" }, { id: "desc" }]
                : props.body.sort === "base_price_asc"
                  ? [{ base_price: "asc" }, { id: "asc" }]
                  : props.body.sort === "base_price_desc"
                    ? [{ base_price: "desc" }, { id: "desc" }]
                    : (() => {
                        throw new HttpException("Unsupported sort key", 400);
                      })();
  const trimmedSearch: string | undefined =
    props.body.search !== undefined && props.body.search.trim().length !== 0
      ? props.body.search.trim()
      : undefined;
  const whereInput = {
    deleted_at: null,
    status: {
      notIn: ["hidden", "deleted", "inactive", "suspended"],
    },
    seller: {
      suspended: false,
      banned: false,
      deleted_at: null,
    },
    ...(props.body.category_id !== undefined && {
      shopping_mall_category_id: props.body.category_id,
    }),
    ...(trimmedSearch !== undefined && {
      OR: [
        {
          name: {
            contains: trimmedSearch,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: trimmedSearch,
            mode: "insensitive",
          },
        },
      ],
    }),
    ...(props.body.minimumBasePrice !== undefined && {
      base_price: {
        gte: props.body.minimumBasePrice,
        ...(props.body.maximumBasePrice !== undefined && {
          lte: props.body.maximumBasePrice,
        }),
      },
    }),
    ...(props.body.minimumBasePrice === undefined &&
      props.body.maximumBasePrice !== undefined && {
        base_price: {
          lte: props.body.maximumBasePrice,
        },
      }),
  } satisfies Prisma.shopping_mall_productsWhereInput;
  const select =
    ShoppingMallProductAtSummaryTransformer.select() satisfies Pick<
      Prisma.shopping_mall_productsFindManyArgs,
      "select"
    >;
  const data = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...select,
  });
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
