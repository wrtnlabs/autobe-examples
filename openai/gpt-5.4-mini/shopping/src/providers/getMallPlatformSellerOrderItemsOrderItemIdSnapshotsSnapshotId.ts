import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformOrderItemSnapshotTransformer } from "../transformers/MallPlatformOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerOrderItemsOrderItemIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformOrderItemSnapshot> {
  const snapshot =
    await MyGlobal.prisma.mall_platform_order_item_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        mall_platform_order_item_id: props.orderItemId,
      },
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
        orderItem: {
          select: {
            id: true,
            seller: {
              select: {
                email: true,
                id: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                rejection_reason: true,
              },
            },
            quantity: true,
            status: true,
            order: {
              select: {
                customer: {
                  select: {
                    email: true,
                    id: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    password_hash: true,
                  },
                },
                id: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                orderItems: {
                  select: {
                    id: true,
                    mall_platform_seller_id: true,
                    mall_platform_order_id: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    mall_platform_product_variant_id: true,
                    quantity: true,
                  },
                },
                shipments: {
                  select: {
                    id: true,
                    mall_platform_seller_id: true,
                    mall_platform_order_id: true,
                    carrier_name: true,
                    tracking_number: true,
                    tracking_url: true,
                    status: true,
                    shipped_at: true,
                    delivered_at: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                order_number: true,
                total_amount: true,
                recipient_name: true,
                recipient_phone: true,
                street_address: true,
                city: true,
                state_province: true,
                postal_code: true,
                country: true,
              },
            },
            productVariant: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                snapshots: true,
                orderItems: true,
                cartItems: true,
                sku_code: true,
                option_values: true,
                price_override: true,
                is_active: true,
                product: {
                  select: {
                    id: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    snapshots: true,
                    reviews: true,
                    name: true,
                    description: true,
                    base_price: true,
                    sellerAccount: {
                      select: {
                        email: true,
                        id: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                        password_hash: true,
                        rejection_reason: true,
                        passwordResets: {
                          select: {
                            id: true,
                          },
                        },
                        approval_status: true,
                        suspended_at: true,
                        sellerProfile: {
                          select: {
                            id: true,
                          },
                        },
                        products: {
                          select: {
                            id: true,
                          },
                        },
                      },
                    },
                    category: {
                      select: {
                        id: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                        parent_category_id: true,
                        name: true,
                        description: true,
                      },
                    },
                    images: true,
                    variants: true,
                    productImageSnapshots: true,
                    variantSnapshots: true,
                    wishlistItems: true,
                  },
                },
                inventoryRecords: true,
              },
            },
            shipmentItem: true,
            cancellationRequests: true,
            refundRequests: true,
            review: true,
            snapshots: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        variantOptions: true,
      },
    });
  if (snapshot.orderItem.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await MallPlatformOrderItemSnapshotTransformer.transform(snapshot);
}
