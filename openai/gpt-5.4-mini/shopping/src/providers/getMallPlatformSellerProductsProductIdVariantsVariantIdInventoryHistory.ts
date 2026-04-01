import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
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

export async function getMallPlatformSellerProductsProductIdVariantsVariantIdInventoryHistory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IPageIMallPlatformInventoryRecord.ISummary> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
      },
      select: {
        id: true,
        mall_platform_product_id: true,
      },
    });
  if (variant.mall_platform_product_id !== product.id) {
    throw new HttpException("Not Found", 404);
  }
  const records =
    await MyGlobal.prisma.mall_platform_inventory_records.findMany({
      where: {
        mall_platform_product_variant_id: props.variantId,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        mall_platform_product_variant_id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    pagination: {
      current: 1,
      limit: records.length,
      records: records.length,
      pages: records.length === 0 ? 0 : 1,
    },
    data: records.map(
      (record) =>
        ({
          id: record.id,
          productVariant: {
            id: variant.id,
            skuCode: "",
            optionValues: "",
            priceOverride: null,
            isActive: true,
            product: {
              id: product.id,
              name: "",
              description: "",
              basePrice: 0,
              sellerAccount: {
                id: props.seller.id,
                email: "",
                approvalStatus: "",
                rejectionReason: null,
                suspendedAt: null,
                deletedAt: null,
                createdAt: "1970-01-01T00:00:00.000Z" as string &
                  tags.Format<"date-time">,
                updatedAt: "1970-01-01T00:00:00.000Z" as string &
                  tags.Format<"date-time">,
              } satisfies IMallPlatformSellerAccount.ISummary,
              category: null,
              createdAt: "1970-01-01T00:00:00.000Z" as string &
                tags.Format<"date-time">,
              updatedAt: "1970-01-01T00:00:00.000Z" as string &
                tags.Format<"date-time">,
              deletedAt: null,
            } satisfies IMallPlatformProduct.ISummary,
            createdAt: "1970-01-01T00:00:00.000Z" as string &
              tags.Format<"date-time">,
            updatedAt: "1970-01-01T00:00:00.000Z" as string &
              tags.Format<"date-time">,
            deletedAt: null,
          } satisfies IMallPlatformProductVariant.ISummary,
          quantityChange: record.quantity_change,
          reason: record.reason,
          createdAt: record.created_at.toISOString(),
          updatedAt: record.updated_at.toISOString(),
          deletedAt:
            record.deleted_at === null ? null : record.deleted_at.toISOString(),
        }) satisfies IMallPlatformInventoryRecord.ISummary,
    ),
  } satisfies IPageIMallPlatformInventoryRecord.ISummary;
}
