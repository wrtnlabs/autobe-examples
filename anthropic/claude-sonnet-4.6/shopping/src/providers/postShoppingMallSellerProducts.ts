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
import { ShoppingMallProductCollector } from "../collectors/ShoppingMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  // Step 1: Verify the referenced category exists (auto-throws 404 if not found)
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: { id: props.body.categoryId },
    select: { id: true },
  });
  // Step 2: Build the Prisma CreateInput using the Collector
  const createData = await ShoppingMallProductCollector.collect({
    body: props.body,
    shoppingMallSellers: { id: props.seller.id },
    shoppingMallSellerSessions: { id: props.seller.session_id },
  });
  // Step 3: Create the product (with nested images and variants) atomically with the initial snapshot
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const product: ShoppingMallProductTransformer.Payload =
      await tx.shopping_mall_products.create({
        data: createData,
        ...ShoppingMallProductTransformer.select(),
      });
    // Step 4: Create the initial product snapshot capturing the complete product state
    const snapshotId: string & tags.Format<"uuid"> = v4();
    const now = new Date();
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: snapshotId,
        product: { connect: { id: product.id } },
        category:
          product.category !== null
            ? { connect: { id: product.category.id } }
            : undefined,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        category_name: product.category ? product.category.name : null,
        created_at: now,
        snapshotImages:
          product.images.length > 0
            ? {
                create: product.images.map((img) => ({
                  id: v4() as string & tags.Format<"uuid">,
                  url: img.url,
                  sequence: img.sequence,
                  created_at: now,
                })),
              }
            : undefined,
        snapshotSkuses:
          product.variants.length > 0
            ? {
                create: product.variants
                  .filter((variant) => variant.deleted_at === null)
                  .map((variant) => ({
                    id: v4() as string & tags.Format<"uuid">,
                    sku_code: variant.sku,
                    price:
                      variant.price_override !== null
                        ? variant.price_override
                        : product.base_price,
                    product_variant_id: variant.id,
                    created_at: now,
                  })),
              }
            : undefined,
      },
    });
    return product;
  });
  // Step 5: Transform and return the full product DTO
  return ShoppingMallProductTransformer.transform(created);
}
