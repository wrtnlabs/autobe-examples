import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCancellationRequestCollector } from "../collectors/EcommerceMallCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequest.ICreate;
}): Promise<IEcommerceMallCancellationRequest> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: { id: props.body.order_item_id },
    });
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: { id: orderItem.ecommerce_mall_order_id },
  });
  if (order.status !== "paid") {
    throw new HttpException(
      "Item cannot be cancelled because it is not in paid status",
      400,
    );
  }
  if (order.customer_id !== props.customer.id) {
    throw new HttpException(
      "Cancellation request denied: Customer does not own this order item",
      403,
    );
  }
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        order_item_id: props.body.order_item_id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "Cancellation request already exists for this order item",
      409,
    );
  }
  const created =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.create({
      data: await EcommerceMallCancellationRequestCollector.collect({
        body: props.body,
        ecommerceMallCustomers: { id: props.customer.id } satisfies IEntity,
      }),
      ...EcommerceMallCancellationRequestTransformer.select(),
    });
  return await EcommerceMallCancellationRequestTransformer.transform(created);
}
