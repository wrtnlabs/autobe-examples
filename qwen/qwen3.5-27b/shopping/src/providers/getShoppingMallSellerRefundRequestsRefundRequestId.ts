import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        status: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            status: true,
          },
        },
        orderItem: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            status: true,
            deleted_at: true,
            price: true,
            quantity: true,
            product_snapshot: true,
            variant_snapshot: true,
            seller_profile_snapshot: true,
            shopping_mall_seller_id: true,
            seller: {
              select: {
                id: true,
              },
            },
            order: {
              select: {
                id: true,
              },
            },
            reviews: {
              select: {
                id: true,
              },
            },
            cancellationRequests: {
              select: {
                id: true,
              },
            },
            refundRequests: {
              select: {
                id: true,
              },
            },
            shipmentItem: {
              select: {
                id: true,
              },
            },
          },
        },
        requested_at: true,
        responded_at: true,
        reason: true,
      },
    });
  if (refundRequest.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallRefundRequestTransformer.transform(refundRequest);
}
