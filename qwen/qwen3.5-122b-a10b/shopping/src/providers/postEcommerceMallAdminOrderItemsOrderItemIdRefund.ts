import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallOrderItemRefundRequestCollector } from "../collectors/EcommerceMallOrderItemRefundRequestCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemRefundRequestTransformer } from "../transformers/EcommerceMallOrderItemRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminOrderItemsOrderItemIdRefund(props: {
  admin: AdminPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemRefundRequest.ICreate;
}): Promise<IEcommerceMallOrderItemRefundRequest> {
  // Verify order item exists
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
    });
  // Create refund request using collector
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.create({
      data: await EcommerceMallOrderItemRefundRequestCollector.collect({
        body: props.body,
        ecommerceMallOrderItems: orderItem,
      }),
      ...EcommerceMallOrderItemRefundRequestTransformer.select(),
    });
  // Transform and return response
  return await EcommerceMallOrderItemRefundRequestTransformer.transform(
    refundRequest,
  );
}
