import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberRefundRequestsRefundRequestId(props: {
  member: MemberPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      select: {
        ...(ShoppingMallRefundRequestTransformer.select().select as any),
        orderItem: {
          select: {
            shopping_mall_order: {
              select: {
                shopping_mall_customer_id: true,
              },
            },
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  if (refundRequest === null || refundRequest.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const orderItem = refundRequest.orderItem as unknown as {
    shopping_mall_order: {
      shopping_mall_customer_id: typeof props.member.id;
    };
    shopping_mall_seller_id: typeof props.member.id;
  };
  const isCustomer =
    orderItem.shopping_mall_order.shopping_mall_customer_id === props.member.id;
  const isSeller = orderItem.shopping_mall_seller_id === props.member.id;
  if (!isCustomer && !isSeller) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallRefundRequestTransformer.transform(
    refundRequest as any,
  );
}
