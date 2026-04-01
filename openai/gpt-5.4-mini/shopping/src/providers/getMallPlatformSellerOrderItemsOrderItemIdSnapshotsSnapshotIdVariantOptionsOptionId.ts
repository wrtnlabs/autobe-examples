import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
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

export async function getMallPlatformSellerOrderItemsOrderItemIdSnapshotsSnapshotIdVariantOptionsOptionId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformOrderItemSnapshotVariantOption> {
  const option =
    await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.findFirstOrThrow(
      {
        where: {
          id: props.optionId,
          deleted_at: null,
          orderItemSnapshot: {
            id: props.snapshotId,
            deleted_at: null,
            orderItem: {
              id: props.orderItemId,
              seller: {
                id: props.seller.id,
              },
            },
          },
        },
        select: {
          id: true,
          option_name: true,
          option_value: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          orderItemSnapshot: {
            select: {
              id: true,
              snapshot_at: true,
              snapshot_reason: true,
              order_item_status: true,
              product_name: true,
              product_description: true,
              product_sku: true,
              variant_sku_code: true,
              seller_shop_name: true,
              seller_shop_description: true,
              seller_logo_image_url: true,
              unit_price: true,
              quantity: true,
              line_total: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    );
  return {
    id: option.id,
    orderItemSnapshot: {
      id: option.orderItemSnapshot.id,
      snapshotAt: toISOStringSafe(option.orderItemSnapshot.snapshot_at),
      snapshotReason: option.orderItemSnapshot.snapshot_reason,
      orderItemStatus: option.orderItemSnapshot.order_item_status,
      productName: option.orderItemSnapshot.product_name,
      productDescription: option.orderItemSnapshot.product_description,
      productSku: option.orderItemSnapshot.product_sku,
      variantSkuCode: option.orderItemSnapshot.variant_sku_code,
      sellerShopName: option.orderItemSnapshot.seller_shop_name,
      sellerShopDescription: option.orderItemSnapshot.seller_shop_description,
      sellerLogoImageUrl: option.orderItemSnapshot.seller_logo_image_url,
      unitPrice: option.orderItemSnapshot.unit_price,
      quantity: option.orderItemSnapshot.quantity,
      lineTotal: option.orderItemSnapshot.line_total,
      createdAt: toISOStringSafe(option.orderItemSnapshot.created_at),
      updatedAt: toISOStringSafe(option.orderItemSnapshot.updated_at),
      deletedAt:
        option.orderItemSnapshot.deleted_at === null
          ? null
          : toISOStringSafe(option.orderItemSnapshot.deleted_at),
    } satisfies IMallPlatformOrderItemSnapshot.ISummary,
    optionName: option.option_name,
    optionValue: option.option_value,
    createdAt: toISOStringSafe(option.created_at),
    updatedAt: toISOStringSafe(option.updated_at),
    deletedAt:
      option.deleted_at === null ? null : toISOStringSafe(option.deleted_at),
  } satisfies IMallPlatformOrderItemSnapshotVariantOption;
}
