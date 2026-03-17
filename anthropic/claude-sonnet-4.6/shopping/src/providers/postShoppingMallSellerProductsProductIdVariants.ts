import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantCollector } from "../collectors/ShoppingMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  // Step 1: Find product, enforce 404 if not found or soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    },
  );
  // Step 2: Enforce seller ownership — 403 if mismatch
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Create the variant (with options) using collector + transformer
  try {
    const created = await MyGlobal.prisma.shopping_mall_product_variants.create(
      {
        data: await ShoppingMallProductVariantCollector.collect({
          body: props.body,
          shoppingMallProducts: { id: props.productId },
          shoppingMallSellers: { id: props.seller.id },
          shoppingMallSellerSessions: { id: props.seller.session_id },
        }),
        ...ShoppingMallProductVariantTransformer.select(),
      },
    );
    // Step 4: Transform and return the created record
    return await ShoppingMallProductVariantTransformer.transform(created);
  } catch (error) {
    // SKU unique constraint violation → 409 Conflict
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Conflict: SKU already exists", 409);
    }
    throw error;
  }
}
