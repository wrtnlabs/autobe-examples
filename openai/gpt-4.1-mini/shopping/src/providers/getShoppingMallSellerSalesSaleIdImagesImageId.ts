import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleImageTransformer } from "../transformers/ShoppingMallSaleImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerSalesSaleIdImagesImageId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleImage> {
  const record =
    await MyGlobal.prisma.shopping_mall_sale_images.findFirstOrThrow({
      where: {
        id: props.imageId,
        shopping_mall_sale_id: props.saleId,
        deleted_at: null,
      },
      ...ShoppingMallSaleImageTransformer.select(),
    });
  return await ShoppingMallSaleImageTransformer.transform(record);
}
