import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrderItemsOrderItemIdRefundRequest(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IProcess;
}): Promise<IShoppingMallRefundRequest> {
  if (props.body.decision !== "approve" && props.body.decision !== "reject") {
    throw new HttpException("Invalid decision", 400);
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const refundRequest = await prisma.shopping_mall_refund_requests.findUnique(
      {
        where: {
          shopping_mall_order_item_id: props.orderItemId,
        },
        select: {
          id: true,
          reason: true,
          status: true,
          reviewed_at: true,
          reviewed_reason: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
          customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        },
      },
    );
    if (refundRequest === null) {
      throw new HttpException("Not Found", 404);
    }
    if (refundRequest.status !== "pending") {
      throw new HttpException("Conflict", 409);
    }
    const reviewedAt = toISOStringSafe(new Date());
    const reviewedReason = props.body.reviewedReason ?? null;
    const updated = await prisma.shopping_mall_refund_requests.update({
      where: {
        id: refundRequest.id,
        status: "pending",
      },
      data: {
        status: props.body.decision === "approve" ? "approved" : "rejected",
        reviewed_at: new Date(reviewedAt),
        reviewed_reason: reviewedReason,
        updated_at: new Date(reviewedAt),
      },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
    return await ShoppingMallRefundRequestTransformer.transform(updated);
  });
}
