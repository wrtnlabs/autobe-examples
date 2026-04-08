import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantOptionAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdVariantsProductVariantIdOptions(props: {
  productId: string;
  productVariantId: string;
  body: IEcommerceMallProductVariantOption.IRequest;
}): Promise<IPageIEcommerceMallProductVariantOption.ISummary> {
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.productVariantId,
      product_id: props.productId,
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    product_variant_id: props.productVariantId,
    ...(props.body.optionName !== undefined && {
      option_name: { contains: props.body.optionName, mode: "insensitive" },
    }),
    ...(props.body.optionValue !== undefined && {
      option_value: { contains: props.body.optionValue, mode: "insensitive" },
    }),
  } satisfies Prisma.ecommerce_mall_product_variant_optionsWhereInput;
  const sortOrder = props.body.sortOrder ?? "asc";
  const orderByInput = (
    props.body.sort === "createdAt"
      ? { created_at: sortOrder }
      : { option_name: sortOrder }
  ) satisfies Prisma.ecommerce_mall_product_variant_optionsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallProductVariantOptionAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallProductVariantOptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
