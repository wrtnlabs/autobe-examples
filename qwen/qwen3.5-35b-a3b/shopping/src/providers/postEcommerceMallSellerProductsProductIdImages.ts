import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.ICreate;
}): Promise<IEcommerceMallProductImage.ISummary> {
  // 1. Validate product exists with seller and category
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      include: {
        seller: true,
        category: true,
      },
    });
  // 2. Verify seller ownership
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Count current active images
  const currentCount =
    await MyGlobal.prisma.ecommerce_mall_product_images.count({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
    });
  // 4. Validate against 20-image maximum (requirement ID 989)
  const expectedCount = currentCount + 1;
  if (expectedCount > 20) {
    throw new HttpException("Maximum 20 images per product allowed", 409);
  }
  // 5. Get next display order
  const maxOrderResult =
    await MyGlobal.prisma.ecommerce_mall_product_images.aggregate({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      _max: {
        display_order: true,
      },
    });
  const nextOrder: number =
    maxOrderResult._max.display_order !== null
      ? maxOrderResult._max.display_order + 1
      : 0;
  // 6. Create image within transaction
  const created = await MyGlobal.prisma.ecommerce_mall_product_images.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      product: { connect: { id: props.productId } },
      image_url: props.body.image_url,
      display_order: nextOrder,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.ecommerce_mall_product_imagesCreateInput,
    select: {
      id: true,
      image_url: true,
      display_order: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 7. Transform and return result
  return {
    id: created.id,
    image_url: created.image_url,
    display_order: created.display_order,
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      is_active: product.is_active,
      created_at: toISOStringSafe(product.created_at),
      seller: {
        id: product.seller.id,
        email: product.seller.email,
        approval_status: product.seller.approval_status as
          | "pending"
          | "approved"
          | "rejected",
        is_suspended: product.seller.is_suspended,
        is_banned: product.seller.is_banned,
        created_at: toISOStringSafe(product.seller.created_at),
      } satisfies IEcommerceMallSeller.ISummary,
      category: {
        id: product.category.id,
        name: product.category.name,
        is_leaf: product.category.is_leaf,
        created_at: toISOStringSafe(product.category.created_at),
        updated_at: toISOStringSafe(product.category.updated_at),
        deleted_at: toISOStringSafe(product.category.deleted_at ?? new Date()),
      } satisfies IEcommerceMallCategory.ISummary,
    } satisfies IEcommerceMallProduct.ISummary,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  } satisfies IEcommerceMallProductImage.ISummary;
}
