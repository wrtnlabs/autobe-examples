import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdVariants(props: {
  productId: string;
  body: IEcommerceMallProductVariant.IRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId, deleted_at: null },
    select: { id: true },
  });
  const where: Prisma.ecommerce_mall_product_variantsWhereInput = {
    product_id: props.productId,
    deleted_at: null,
    ...(props.body.search && {
      sku_code: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...((props.body.optionName || props.body.optionValue) && {
      variantOptions: {
        some: {
          ...(props.body.optionName && {
            option_name: {
              contains: props.body.optionName,
              mode: "insensitive" as const,
            },
          }),
          ...(props.body.optionValue && {
            option_value: {
              contains: props.body.optionValue,
              mode: "insensitive" as const,
            },
          }),
        },
      },
    }),
  };
  let variants = await MyGlobal.prisma.ecommerce_mall_product_variants.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallProductVariantAtSummaryTransformer.select(),
    },
  );
  if (props.body.inStock !== undefined) {
    const variantsWithStock = await Promise.all(
      variants.map(async (v) => {
        const stockSum =
          await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
            where: { variant: { id: v.id } },
            _sum: { quantity_change: true },
          });
        const stock = stockSum._sum?.quantity_change ?? 0;
        return { variant: v, stock };
      }),
    );
    variants = variantsWithStock
      .filter(({ stock }) => (props.body.inStock ? stock > 0 : stock <= 0))
      .map(({ variant }) => variant);
  }
  const total = await MyGlobal.prisma.ecommerce_mall_product_variants.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      variants,
      EcommerceMallProductVariantAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
