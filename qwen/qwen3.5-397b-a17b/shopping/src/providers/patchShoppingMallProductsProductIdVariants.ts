import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      deleted: false,
    },
  });
  const sortField = props.body.sort?.split(",")[0] ?? "created_at";
  const sortDirection = (props.body.sort?.split(",")[1] ?? "desc") as
    | "asc"
    | "desc";
  const validSortFields = [
    "created_at",
    "updated_at",
    "sku_code",
    "stock_quantity",
  ];
  const validatedSortField = validSortFields.includes(sortField)
    ? sortField
    : "created_at";
  const orderByInput: Prisma.shopping_mall_product_variantsOrderByWithRelationInput =
    {
      [validatedSortField]: sortDirection,
    };
  const whereInput: Prisma.shopping_mall_product_variantsWhereInput = {
    shopping_mall_product_id: props.productId,
    deleted: props.body.deleted ?? false,
    ...(props.body.search && {
      sku_code: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.inStock === true && {
      stock_quantity: {
        gt: 0,
      },
    }),
    ...(props.body.optionValue && {
      options: {
        some: {
          value: {
            contains: props.body.optionValue,
            mode: "insensitive",
          },
        },
      },
    }),
  };
  const [variants, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        options: {
          select: {
            id: true,
            key: true,
            value: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_product_variants.count({
      where: whereInput,
    }),
  ]);
  const data = variants.map((variant) => {
    const optionValues = variant.options.map((option) => {
      return {
        id: option.id,
        key: option.key,
        value: option.value,
        variant: {
          id: variant.id,
          skuCode: variant.sku_code,
          optionValues: [],
          price: variant.price ?? null,
          stockQuantity: variant.stock_quantity,
        } satisfies IShoppingMallProductVariant.ISummary,
        created_at: toISOStringSafe(option.created_at),
        updated_at: toISOStringSafe(option.updated_at),
      };
    });
    return {
      id: variant.id,
      skuCode: variant.sku_code,
      optionValues: optionValues,
      price: variant.price ?? null,
      stockQuantity: variant.stock_quantity,
    } satisfies IShoppingMallProductVariant.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
