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

export async function patchEcommerceMallVariantsVariantIdOptions(props: {
  variantId: string;
  body: IEcommerceMallProductVariantOption.IUpdate;
}): Promise<IEcommerceMallProductVariantOption> {
  // Step 1: Validate variant exists
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        sku_code: true,
        price: true,
      },
    });
  // Step 2: Check deletion constraints - pending order items
  const pendingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        variant_id: props.variantId,
        OR: [{ status: { in: ["paid", "shipped", "delivered"] } }],
      },
    });
  if (pendingOrderItems.length > 0) {
    throw new HttpException("Cannot modify variant with pending orders", 403);
  }
  // Step 3: Create snapshot before modification
  await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.create({
    data: {
      id: v4(),
      product_variant_id: props.variantId,
      sku_code: variant.sku_code,
      price: variant.price ?? 0,
      created_at: new Date(),
    },
  });
  // Step 4: Transactional bulk replacement
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // a. Delete all existing options
    await tx.ecommerce_mall_product_variant_options.deleteMany({
      where: { product_variant_id: props.variantId },
    });
    // b. Insert new option - check if body has required fields
    if (
      props.body.option_name === undefined ||
      props.body.option_value === undefined
    ) {
      throw new HttpException("option_name and option_value are required", 400);
    }
    const newOption = await tx.ecommerce_mall_product_variant_options.create({
      data: {
        id: v4(),
        product_variant_id: props.variantId,
        option_name: props.body.option_name,
        option_value: props.body.option_value,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    // c. Update variant timestamp
    await tx.ecommerce_mall_product_variants.update({
      where: { id: props.variantId },
      data: { updated_at: new Date() },
    });
    return newOption;
  });
  // Transform and return
  const fullOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: result.id },
        ...EcommerceMallProductVariantOptionTransformer.select(),
      },
    );
  return EcommerceMallProductVariantOptionTransformer.transform(fullOption);
}
