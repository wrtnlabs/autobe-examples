import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorProductsProductIdVariantsVariantId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductVariant> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: {
      id: props.productId,
    },
    select: {
      id: true,
    },
  });
  const variant =
    await MyGlobal.prisma.mall_platform_product_variants.findFirstOrThrow({
      where: {
        id: props.variantId,
        mall_platform_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        is_active: true,
      },
    });
  return {
    status: variant.is_active ? "available" : "unavailable",
  };
}
