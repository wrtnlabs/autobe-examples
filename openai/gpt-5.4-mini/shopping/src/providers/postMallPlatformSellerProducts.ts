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
import { MallPlatformProductCollector } from "../collectors/MallPlatformProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductTransformer } from "../transformers/MallPlatformProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerProducts(props: {
  seller: SellerPayload;
  body: IMallPlatformProduct.ICreate;
}): Promise<IMallPlatformProduct> {
  const seller =
    await MyGlobal.prisma.mall_platform_seller_accounts.findFirstOrThrow({
      where: {
        id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
        approval_status: true,
        suspended_at: true,
        deleted_at: true,
      },
    });
  if (seller.approval_status !== "approved") {
    throw new HttpException("Seller is not allowed to create products", 403);
  }
  if (seller.suspended_at !== null) {
    throw new HttpException("Seller is suspended", 403);
  }
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    if (props.body.categoryId !== null) {
      await prisma.mall_platform_categories.findFirstOrThrow({
        where: {
          id: props.body.categoryId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    }
    return await prisma.mall_platform_products.create({
      data: await MallPlatformProductCollector.collect({
        body: props.body,
        sellerAccount: props.seller,
      }),
      ...MallPlatformProductTransformer.select(),
    });
  });
  return await MallPlatformProductTransformer.transform(created);
}
