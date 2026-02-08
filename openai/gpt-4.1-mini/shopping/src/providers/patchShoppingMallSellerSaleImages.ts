import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
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

export async function patchShoppingMallSellerSaleImages(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleImage.IRequest;
}): Promise<IPageIShoppingMallSaleImage.ISummary> {
  // Set default pagination parameters
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query sale images linked to sales of this seller, excluding soft-deleted records
  const data = await MyGlobal.prisma.shopping_mall_sale_images.findMany({
    where: {
      deleted_at: null,
      sale: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
    },
    skip,
    take: limit,
    orderBy: { display_order: "asc" },
    select: {
      id: true,
      image_url: true,
      display_order: true,
      alt_text: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Count total sale images for pagination
  const total = await MyGlobal.prisma.shopping_mall_sale_images.count({
    where: {
      deleted_at: null,
      sale: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
    },
  });
  return {
    data: data.map((image) => ({
      id: image.id,
      image_url: image.image_url,
      display_order: image.display_order,
      alt_text: image.alt_text,
      created_at: toISOStringSafe(image.created_at),
      updated_at: toISOStringSafe(image.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
