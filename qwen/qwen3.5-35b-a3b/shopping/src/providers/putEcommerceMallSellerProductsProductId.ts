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

export async function putEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IUpdate;
}): Promise<IEcommerceMallProduct> {
  // 1. Fetch and validate product exists with full data for snapshot
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_id: true,
        name: true,
        description: true,
        base_price: true,
        slug: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        category_id: true,
      },
    });
  // 2. Verify ownership
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Create snapshot of current product state (required by spec)
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4(),
      product: { connect: { id: props.productId } },
      name: product.name,
      description: product.description ?? null,
      base_price: Number(product.base_price),
      slug: product.slug,
      status: product.status,
      created_at: product.created_at,
      updated_at: product.updated_at,
    },
  });
  // 4. Build update data with only provided fields
  const updateData: {
    name?: string;
    description?: string | null;
    base_price?: number;
    slug?: string;
    status?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.basePrice !== undefined && {
      base_price: props.body.basePrice,
    }),
    ...(props.body.slug !== undefined && { slug: props.body.slug }),
    ...(props.body.status !== undefined && { status: props.body.status }),
  };
  // 5. Apply update with full relationships selected
  const updated = await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: updateData,
    ...EcommerceMallProductTransformer.select(),
  });
  // 6. Transform and return
  return await EcommerceMallProductTransformer.transform(updated);
}
