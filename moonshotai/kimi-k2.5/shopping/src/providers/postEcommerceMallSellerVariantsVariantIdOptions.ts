import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantOptionCollector } from "../collectors/EcommerceMallProductVariantOptionCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantOptionTransformer } from "../transformers/EcommerceMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerVariantsVariantIdOptions(props: {
  seller: SellerPayload;
  variantId: string;
  body: IEcommerceMallProductVariantOption.ICreate;
}): Promise<IEcommerceMallProductVariantOption> {
  // Verify variant exists and get product for ownership check
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        product: {
          select: {
            id: true,
            seller_id: true,
          },
        },
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Verify seller owns the product
  if (variant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for duplicate option name within this variant
  const existingOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findFirst({
      where: {
        product_variant_id: props.variantId,
        option_name: props.body.optionName,
      },
    });
  if (existingOption !== null) {
    throw new HttpException("Option name already exists for this variant", 409);
  }
  // Collect data using the collector with correct typing
  const createData = await EcommerceMallProductVariantOptionCollector.collect({
    body: props.body,
    ecommerceMallProductVariants: { id: variant.id } satisfies IEntity,
  });
  // Create the option record
  const created =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.create({
      data: createData,
      ...EcommerceMallProductVariantOptionTransformer.select(),
    });
  // Transform and return
  return await EcommerceMallProductVariantOptionTransformer.transform(created);
}
