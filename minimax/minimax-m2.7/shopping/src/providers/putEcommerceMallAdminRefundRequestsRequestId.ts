import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminRefundRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IUpdate;
}): Promise<IEcommerceMallRefundRequest> {
  // Fetch the refund request with all needed relations
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_mall_order_item_id: true,
        ecommerce_mall_customer_id: true,
        ecommerce_mall_seller_id: true,
        reason: true,
        status: true,
        seller_response_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            unit_price: true,
            status: true,
            created_at: true,
            ecommerce_mall_product_variant_id: true,
            order: {
              select: {
                id: true,
                order_number: true,
              },
            },
            productSnapshot: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                category_name: true,
                created_at: true,
                seller: {
                  select: {
                    id: true,
                    email: true,
                    approval_status: true,
                    created_at: true,
                    profile: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                      },
                    },
                  },
                },
              },
            },
            sellerProfileSnapshot: {
              select: {
                id: true,
                shop_name: true,
                shop_description: true,
                logo_url: true,
                created_at: true,
              },
            },
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            profile: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        refundRequestSnapshots: {
          select: {
            id: true,
            snapshot_reason: true,
            snapshot_status: true,
            seller_response: true,
            seller_response_reason: true,
            created_at: true,
            updated_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                created_at: true,
                profile: {
                  select: {
                    display_name: true,
                  },
                },
              },
            },
            seller: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                created_at: true,
                profile: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  // Check if status is already processed (not pending)
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request is not pending", 400);
  }
  const now = new Date();
  // Update refund request status and seller response timestamp
  await MyGlobal.prisma.ecommerce_mall_refund_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      seller_response_at: now,
      updated_at: now,
    },
  });
  // Create refund request snapshot for audit trail
  const snapshotId = v4();
  await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.create({
    data: {
      id: snapshotId,
      ecommerce_mall_refund_request_id: refundRequest.id,
      ecommerce_mall_customer_id: refundRequest.ecommerce_mall_customer_id,
      ecommerce_mall_seller_id: refundRequest.ecommerce_mall_seller_id,
      snapshot_reason: refundRequest.reason,
      snapshot_status: refundRequest.status,
      seller_response: props.body.status,
      seller_response_reason: null,
      created_at: now,
      updated_at: now,
    },
  });
  // If approved, update order item status and restore inventory
  if (props.body.status === "approved") {
    // Update order item status to refunded
    await MyGlobal.prisma.ecommerce_mall_order_items.update({
      where: { id: refundRequest.ecommerce_mall_order_item_id },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
    // Create inventory record to restore stock
    const inventoryRecordId = v4();
    await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
      data: {
        id: inventoryRecordId,
        ecommerce_mall_product_variant_id:
          refundRequest.orderItem.ecommerce_mall_product_variant_id,
        quantity_change: refundRequest.orderItem.quantity,
        reason: "Refund approved - inventory restored",
        created_at: now,
      },
    });
  }
  return EcommerceMallRefundRequestTransformer.transform(
    refundRequest as any,
    props.requestId,
  );
}
