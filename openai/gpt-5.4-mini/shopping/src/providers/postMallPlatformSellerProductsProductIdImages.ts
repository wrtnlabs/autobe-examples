import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformProductImageCollector } from "../collectors/MallPlatformProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductImageTransformer } from "../transformers/MallPlatformProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.ICreate;
}): Promise<IMallPlatformProductImage> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        deleted_at: true,
        seller_account_id: true,
      },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product is not available", 404);
  }
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  try {
    const created = await MyGlobal.prisma.mall_platform_product_images.create({
      data: await MallPlatformProductImageCollector.collect({
        body: props.body,
        product: { id: props.productId },
      }),
      ...MallPlatformProductImageTransformer.select(),
    });
    return await MallPlatformProductImageTransformer.transform(created);
  } catch (error) {
    const unknownError = error as {
      code?: string;
    };
    if (unknownError.code === "P2002") {
      throw new HttpException(
        "Product image already exists for this product",
        400,
      );
    }
    throw error;
  }
}
