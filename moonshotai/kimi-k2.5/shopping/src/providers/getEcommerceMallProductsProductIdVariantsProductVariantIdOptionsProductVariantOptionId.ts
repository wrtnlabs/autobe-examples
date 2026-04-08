import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantOptionTransformer } from "../transformers/EcommerceMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallProductsProductIdVariantsProductVariantIdOptionsProductVariantOptionId(props: {
  productId: string;
  productVariantId: string;
  productVariantOptionId: string;
}): Promise<IEcommerceMallProductVariantOption> {
  const option =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.productVariantOptionId },
        ...EcommerceMallProductVariantOptionTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantOptionTransformer.transform(option);
}
