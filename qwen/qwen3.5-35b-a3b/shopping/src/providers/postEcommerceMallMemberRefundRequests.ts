import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallRefundRequestCollector } from "../collectors/EcommerceMallRefundRequestCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallMemberRefundRequests(props: {
  member: MemberPayload;
  body: IEcommerceMallRefundRequest.ICreate;
}): Promise<IEcommerceMallRefundRequest> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.order_item_id },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        status: true,
        created_at: true,
      },
    });
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: { id: orderItem.ecommerce_mall_order_id },
    select: {
      member: {
        select: {
          id: true,
        },
      },
    },
  });
  if (order.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException("Order item must be delivered", 400);
  }
  const sevenDaysLater: string & tags.Format<"date-time"> = (() => {
    const date = new Date(orderItem.created_at);
    date.setDate(date.getDate() + 7);
    return toISOStringSafe(date);
  })();
  if (toISOStringSafe(new Date()) > sevenDaysLater) {
    throw new HttpException("Refund request outside 7-day window", 400);
  }
  const existing =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        order_item_id: props.body.order_item_id,
        deleted_at: null,
      },
    });
  if (
    existing &&
    existing.status !== "rejected" &&
    existing.status !== "approved"
  ) {
    throw new HttpException("Refund request already exists", 409);
  }
  const record = await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
    data: await EcommerceMallRefundRequestCollector.collect({
      body: props.body,
    }),
    ...EcommerceMallRefundRequestTransformer.select(),
  });
  return await EcommerceMallRefundRequestTransformer.transform(record);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallMemberRefundRequests(props: {
//   member: MemberPayload;
//   body: IEcommerceMallRefundRequest.ICreate;
// }): Promise<IEcommerceMallRefundRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
//     data: await EcommerceMallRefundRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallRefundRequestTransformer.select(),
//   });
//   return await EcommerceMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------