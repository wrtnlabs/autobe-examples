import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformProductVariantCollector } from "../collectors/MallPlatformProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariant.ICreate;
}): Promise<IMallPlatformProductVariant> {
  const product = await MyGlobal.prisma.mall_platform_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
      },
      select: {
        id: true,
      },
    },
  );
  const duplicated =
    await MyGlobal.prisma.mall_platform_product_variants.findFirst({
      where: {
        sku_code: props.body.skuCode,
      },
      select: {
        id: true,
      },
    });
  if (duplicated !== null) {
    throw new HttpException("SKU code already exists", 409);
  }
  await MyGlobal.prisma.mall_platform_product_variants.create({
    data: await MallPlatformProductVariantCollector.collect({
      body: props.body,
      product,
    }),
  });
  return {
    status: "unavailable",
  };
}
