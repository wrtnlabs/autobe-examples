import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function postShoppingMallSellerSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const seller = await prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: {
        id: true,
        approval_status: true,
        suspended: true,
        banned: true,
        deleted_at: true,
      },
    });
    if (seller.deleted_at !== null)
      throw new HttpException("Seller account is deleted", 403);
    if (seller.banned === true)
      throw new HttpException("Seller account is banned", 403);
    if (seller.suspended === true)
      throw new HttpException("Seller account is suspended", 403);
    if (seller.approval_status !== "approved")
      throw new HttpException("Seller is not approved to create products", 403);
    if (props.body.shopping_mall_category_id !== null)
      await prisma.shopping_mall_categories.findFirstOrThrow({
        where: {
          id: props.body.shopping_mall_category_id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    const created = await prisma.shopping_mall_products.create({
      data: await ShoppingMallProductCollector.collect({
        body: props.body,
        seller: {
          id: props.seller.id,
        },
      }),
      ...ShoppingMallProductTransformer.select(),
    });
    return await ShoppingMallProductTransformer.transform(created);
  });
}
