import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleImageCollector } from "../collectors/ShoppingMallSaleImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleImageTransformer } from "../transformers/ShoppingMallSaleImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSalesSaleIdImages(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleImage.ICreate;
}): Promise<IShoppingMallSaleImage> {
  // Verify existence and ownership of the sale
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
    select: {
      id: true,
      seller_id: true,
      created_at: true,
      name: true,
      updated_at: true,
      deleted_at: true,
      status: true,
      description: true,
      base_price: true,
      category_id: true,
    },
  });
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Create the sale image record within a transaction
  const createdImage = await MyGlobal.prisma.$transaction(async (prisma) => {
    const createInput = await ShoppingMallSaleImageCollector.collect({
      body: props.body,
      sale: sale,
    });
    return await prisma.shopping_mall_sale_images.create({
      data: createInput,
      select: {
        id: true,
        shopping_mall_sale_id: true,
        image_url: true,
        display_order: true,
        alt_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  });
  // Add 'sale' property to match IShoppingMallSaleImage expected shape without converting Dates to strings
  const transformedImage = {
    ...createdImage,
    created_at: createdImage.created_at,
    updated_at: createdImage.updated_at,
    deleted_at: createdImage.deleted_at ?? null,
    sale: {
      id: sale.id,
      seller_id: sale.seller_id,
      created_at: sale.created_at,
      updated_at: sale.updated_at,
      deleted_at: sale.deleted_at ?? null,
      name: sale.name,
      status: sale.status,
      description: sale.description,
      base_price: sale.base_price,
      category_id: sale.category_id,
    },
  };
  // Transform using transformer
  return await ShoppingMallSaleImageTransformer.transform(transformedImage);
}
