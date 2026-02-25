import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  // 1. Fetch product and verify ownership
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
        deleted_at: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // 2. Validation
  if (props.body.name !== undefined) {
    const existingProduct =
      await MyGlobal.prisma.shopping_mall_products.findFirst({
        where: {
          seller_id: props.seller.id,
          name: props.body.name,
          id: { not: props.productId },
          deleted_at: null,
        },
      });
    if (existingProduct !== null) {
      throw new HttpException(
        "Product name must be unique within your catalog",
        409,
      );
    }
  }
  if (props.body.category_id !== undefined && props.body.category_id !== null) {
    const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        id: props.body.category_id,
        deleted_at: null,
      },
    });
    if (category === null) {
      throw new HttpException("Category not found", 404);
    }
  }
  // 3. Create snapshot before update
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId },
    });
  const images = await MyGlobal.prisma.shopping_mall_product_images.findMany({
    where: { shopping_mall_product_id: props.productId },
  });
  const snapshotId = v4();
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      shopping_mall_product_id: product.id,
      shopping_mall_seller_id: product.seller_id,
      shopping_mall_category_id: product.category_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      created_at: new Date(),
    },
  });
  await Promise.all(
    variants.map((variant) =>
      MyGlobal.prisma.shopping_mall_product_variant_snapshots.create({
        data: {
          id: v4(),
          shopping_mall_product_snapshot_id: snapshotId,
          shopping_mall_product_variant_id: variant.id,
          sku_code: variant.sku_code,
          price_override: variant.price,
          created_at: new Date(),
        },
      }),
    ),
  );
  await Promise.all(
    images.map((image) =>
      MyGlobal.prisma.shopping_mall_product_snapshot_images.create({
        data: {
          id: v4(),
          shopping_mall_product_snapshot_id: snapshotId,
          shopping_mall_product_image_id: image.id,
          created_at: new Date(),
        },
      }),
    ),
  );
  // 4. Update product
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.category_id !== undefined && {
        category_id: props.body.category_id,
      }),
      ...(props.body.base_price !== undefined && {
        base_price: props.body.base_price,
      }),
      updated_at: new Date(),
    },
  });
  // 5. Return updated product using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...ShoppingMallProductTransformer.select(),
    });
  return await ShoppingMallProductTransformer.transform(updated);
}
