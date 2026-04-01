import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
        deleted_at: null,
      },
      include: {
        customer: true,
        snapshots: true,
        inventoryRecords: true,
        orderItem: {
          include: {
            order: {
              include: {
                customer: {
                  select: {
                    email: true,
                    id: true,
                  },
                },
                snapshots: true,
                shippingAddress: {
                  include: {
                    customer: {
                      select: {
                        email: true,
                        created_at: true,
                        updated_at: true,
                        id: true,
                        status: true,
                        deleted_at: true,
                        password_hash: true,
                      },
                    },
                    snapshots: true,
                    orders: true,
                  },
                },
                inventoryRecords: true,
                orderItems: true,
                shipments: true,
                reviews: true,
              },
            },
            productSnapshot: true,
            variantSnapshot: true,
            sellerSnapshot: true,
            snapshots: true,
            shipmentItems: true,
            cancellationRequests: true,
            refundRequests: true,
          },
        },
      },
    });
  const orderItemSellerId = refundRequest.orderItem.order.customer_id;
  if (orderItemSellerId !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallRefundRequestTransformer.transform(refundRequest);
}
