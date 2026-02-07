import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductVariantOptionAtSummaryTransformer } from "../transformers/EcommerceProductVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProductsProductIdVariantsVariantIdOptions(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceProductVariantOption.IRequest;
}): Promise<IPageIEcommerceProductVariantOption.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_product_variant_id: props.variantId,
    option_key: props.body.optionKey
      ? { contains: props.body.optionKey }
      : undefined,
    option_value: props.body.optionValue
      ? { contains: props.body.optionValue }
      : undefined,
    deleted_at: null,
  } satisfies Prisma.ecommerce_product_variant_optionsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_product_variant_options.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceProductVariantOptionAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_product_variant_options.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceProductVariantOptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } as IPageIEcommerceProductVariantOption.ISummary;
}
