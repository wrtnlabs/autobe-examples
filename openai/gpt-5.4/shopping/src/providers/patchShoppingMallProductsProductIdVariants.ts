import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const direction: "asc" | "desc" = props.body.direction ?? "desc";
  const whereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.search !== undefined && {
      OR: [
        {
          sku_code: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          option_summary: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    }),
    ...(props.body.skuCode !== undefined && {
      sku_code: {
        contains: props.body.skuCode,
        mode: "insensitive",
      },
    }),
    ...(props.body.optionSummary !== undefined && {
      option_summary: {
        contains: props.body.optionSummary,
        mode: "insensitive",
      },
    }),
    ...(props.body.price !== undefined && {
      price: props.body.price,
    }),
    ...(props.body.createdAt !== undefined && {
      created_at: {
        equals: props.body.createdAt,
      },
    }),
    ...(props.body.updatedAt !== undefined && {
      updated_at: {
        equals: props.body.updatedAt,
      },
    }),
    ...(props.body.deletedAt === undefined
      ? { deleted_at: null }
      : props.body.deletedAt === null
        ? { deleted_at: null }
        : {
            deleted_at: {
              equals: props.body.deletedAt,
            },
          }),
  } satisfies Prisma.shopping_mall_product_variantsWhereInput;
  const orderByInput: Prisma.shopping_mall_product_variantsOrderByWithRelationInput[] =
    props.body.sort === "skuCode"
      ? [{ sku_code: direction }, { id: "asc" }]
      : props.body.sort === "optionSummary"
        ? [{ option_summary: direction }, { id: "asc" }]
        : props.body.sort === "price"
          ? [{ price: direction }, { id: "asc" }]
          : props.body.sort === "createdAt"
            ? [{ created_at: direction }, { id: "asc" }]
            : props.body.sort === "updatedAt"
              ? [{ updated_at: direction }, { id: "asc" }]
              : props.body.sort === "deletedAt"
                ? [{ deleted_at: direction }, { id: "asc" }]
                : [{ created_at: "desc" }, { id: "asc" }];
  const data = await MyGlobal.prisma.shopping_mall_product_variants.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallProductVariantAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_product_variants.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductVariantAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
