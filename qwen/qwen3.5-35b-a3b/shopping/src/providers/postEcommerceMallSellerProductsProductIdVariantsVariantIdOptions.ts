import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { EcommerceMallProductVariantOptionTransformer } from "../transformers/EcommerceMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdVariantsVariantIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOption.ICreate;
}): Promise<IEcommerceMallProductVariantOption> {
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.variantId,
      product_id: props.productId,
    },
  });
  const existingOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findFirst({
      where: {
        product_variant_id: props.variantId,
        key: props.body.key,
        deleted_at: null,
      },
    });
  if (existingOption !== null) {
    throw new HttpException("Conflict", 409);
  }
  const createdOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        product_variant_id: props.variantId,
        key: props.body.key,
        value: props.body.value,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productVariant:
          EcommerceMallProductVariantAtSummaryTransformer.select(),
      },
    });
  await MyGlobal.prisma.ecommerce_mall_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      entity_type: "product_variant_option",
      entity_id: createdOption.id,
      actor_id: props.seller.id,
      snapshot_data: JSON.stringify(createdOption),
      version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  return await EcommerceMallProductVariantOptionTransformer.transform(
    createdOption,
  );
}
