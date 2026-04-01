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

export async function getMallPlatformAdministratorProductVariantsProductVariantIdAvailability(props: {
  administrator: AdministratorPayload;
  productVariantId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductVariant> {
  const variant =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: {
        id: props.productVariantId,
      },
      select: {
        id: true,
        is_active: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
            deleted_at: true,
            variants: {
              select: {
                id: true,
                is_active: true,
                deleted_at: true,
                inventoryRecords: {
                  select: {
                    quantity_change: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
        inventoryRecords: {
          select: {
            quantity_change: true,
            deleted_at: true,
          },
        },
      },
    });
  if (
    variant.deleted_at !== null ||
    variant.product.deleted_at !== null ||
    variant.is_active === false
  ) {
    return {
      status: "unavailable",
    };
  }
  const currentStock = variant.inventoryRecords.reduce((sum, record) => {
    if (record.deleted_at !== null) return sum;
    return sum + record.quantity_change;
  }, 0);
  const hasPurchasableVariant = variant.product.variants.some(
    (productVariant) => {
      if (
        productVariant.deleted_at !== null ||
        productVariant.is_active === false
      )
        return false;
      const stock = productVariant.inventoryRecords.reduce((sum, record) => {
        if (record.deleted_at !== null) return sum;
        return sum + record.quantity_change;
      }, 0);
      return stock > 0;
    },
  );
  if (hasPurchasableVariant === false) {
    return {
      status: "unavailable",
    };
  }
  if (currentStock <= 0) {
    return {
      status: "outOfStock",
    };
  }
  return {
    status: "available",
  };
}
