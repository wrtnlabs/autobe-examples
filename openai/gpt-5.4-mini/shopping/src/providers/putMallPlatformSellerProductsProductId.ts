import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductTransformer } from "../transformers/MallPlatformProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProduct.IUpdate;
}): Promise<IMallPlatformProduct> {
  const existing = await MyGlobal.prisma.mall_platform_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      seller_account_id: true,
      category_id: true,
      name: true,
      description: true,
      base_price: true,
      deleted_at: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });
  if (existing === null) {
    throw new HttpException("Not Found", 404);
  }
  if (existing.deleted_at !== null) {
    throw new HttpException("Conflict", 409);
  }
  if (existing.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.categoryId !== undefined && props.body.categoryId !== null) {
    await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
      where: { id: props.body.categoryId },
      select: { id: true },
    });
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_product_snapshots.create({
      data: {
        id: v4(),
        mall_platform_product_id: existing.id,
        snapshot_kind: "update_before",
        product_name: existing.name,
        product_description: existing.description,
        category_name: existing.category?.name ?? null,
        base_price: existing.base_price,
        main_image_uri: null,
        image_count: 0,
        variant_count: 0,
        created_at: new Date(),
      },
    });
    await prisma.mall_platform_products.update({
      where: { id: props.productId },
      data: {
        ...(props.body.name !== undefined ? { name: props.body.name } : {}),
        ...(props.body.description !== undefined
          ? { description: props.body.description }
          : {}),
        ...(props.body.categoryId !== undefined
          ? { category_id: props.body.categoryId }
          : {}),
        ...(props.body.basePrice !== undefined
          ? { base_price: props.body.basePrice }
          : {}),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...MallPlatformProductTransformer.select(),
    });
  return await MallPlatformProductTransformer.transform(updated);
}
