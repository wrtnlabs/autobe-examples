import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductImageCollector } from "../collectors/ShoppingMallProductImageCollector";
import { ShoppingMallProductVariantCollector } from "../collectors/ShoppingMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: props.body.shopping_mall_category_id },
    select: { id: true },
  });
  if (!category) {
    throw new HttpException("Category not found", 400);
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: { id: true, approval_status: true },
  });
  if (!seller || seller.approval_status !== "approved") {
    throw new HttpException("Seller account not approved", 403);
  }
  const variants = await ArrayUtil.asyncMap(
    props.body.variants,
    async (variant) => {
      const existingVariant =
        await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
          where: { sku_code: variant.sku_code, product: { deleted_at: null } },
        });
      if (existingVariant) {
        throw new HttpException(
          `SKU code '${variant.sku_code}' is already in use`,
          409,
        );
      }
      return ShoppingMallProductVariantCollector.collect({
        body: variant,
        product: { id: "PLACEHOLDER" },
      });
    },
  );
  const productImages = props.body.images
    ? await ArrayUtil.asyncMap(props.body.images, async (image) =>
        ShoppingMallProductImageCollector.collect({
          body: image,
          shoppingMallSellers: { id: props.seller.id },
          shoppingMallProductImages: { id: v4() },
        }),
      )
    : [];
  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      is_deleted: false,
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
      category: { connect: { id: props.body.shopping_mall_category_id } },
      variants: {
        create: variants,
      },
      productImages: {
        create: productImages,
      },
    },
    ...ShoppingMallProductTransformer.select(),
  });
  return await ShoppingMallProductTransformer.transform(created);
}
