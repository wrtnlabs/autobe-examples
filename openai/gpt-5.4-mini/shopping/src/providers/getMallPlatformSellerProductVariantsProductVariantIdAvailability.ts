import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
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

export async function getMallPlatformSellerProductVariantsProductVariantIdAvailability(props: {
  seller: SellerPayload;
  productVariantId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductVariant> {
  const productVariant =
    await MyGlobal.prisma.mall_platform_product_variants.findFirst({
      where: {
        id: props.productVariantId,
        deleted_at: null,
      },
      select: {
        id: true,
        is_active: true,
        deleted_at: true,
      },
    });
  if (productVariant === null) {
    throw new HttpException("Not Found", 404);
  }
  if (
    productVariant.deleted_at !== null ||
    productVariant.is_active === false
  ) {
    return { status: "unavailable" };
  }
  return { status: "available" };
}
