import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommerceMallProduct.ICreate;
}): Promise<IEcommerceMallProduct> {
  const existingCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.body.category_id },
      select: { id: true },
    });
  const existingSeller =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { id: true, approval_status: true, is_suspended: true },
    });
  if (
    existingSeller.is_suspended ||
    existingSeller.approval_status !== "approved"
  ) {
    throw new HttpException("Seller account is not active", 403);
  }
  const createdProduct = await MyGlobal.prisma.ecommerce_mall_products.create({
    data: {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      is_available: props.body.is_available ?? true,
      seller: { connect: { id: props.seller.id } },
      category: { connect: { id: props.body.category_id } },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      images: props.body.images?.length
        ? {
            create: props.body.images.map((img, idx) => ({
              id: v4(),
              image_url: img.files[0],
              sort_order: idx,
              is_main: idx === 0,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            })),
          }
        : undefined,
      variants: props.body.variants?.length
        ? {
            create: props.body.variants.map((variant) => ({
              id: v4(),
              sku_code: variant.sku_code,
              price_override: variant.price_override ?? null,
              stock_quantity: 0,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            })),
          }
        : undefined,
    },
    ...EcommerceMallProductTransformer.select(),
  });
  return await EcommerceMallProductTransformer.transform(createdProduct);
}
