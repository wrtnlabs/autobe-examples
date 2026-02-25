import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductImageCollector } from "../collectors/EcommerceProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductImageTransformer } from "../transformers/EcommerceProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductImage.ICreate;
}): Promise<IEcommerceProductImage> {
  // Verify product exists and belongs to the authenticated seller
  try {
    const product = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        ecommerce_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true, updated_at: true },
    });
  } catch {
    throw new HttpException(
      "Product not found or you don't have permission",
      403,
    );
  }
  // Create image using collector with try-catch for position conflicts
  let created;
  try {
    created = await MyGlobal.prisma.ecommerce_product_images.create({
      data: await EcommerceProductImageCollector.collect({
        body: props.body,
        ecommerceProducts: { id: props.productId },
      }),
      ...EcommerceProductImageTransformer.select(),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      typeof error.meta?.target === "string" &&
      error.meta.target.includes("position")
    ) {
      throw new HttpException(
        "Image position already exists for this product",
        409,
      );
    }
    throw error;
  }
  // Update product's updated_at timestamp with current ISO string
  await MyGlobal.prisma.ecommerce_products.update({
    where: { id: props.productId },
    data: { updated_at: toISOStringSafe(new Date()) },
  });
  // Transform and return
  return await EcommerceProductImageTransformer.transform(created);
}
