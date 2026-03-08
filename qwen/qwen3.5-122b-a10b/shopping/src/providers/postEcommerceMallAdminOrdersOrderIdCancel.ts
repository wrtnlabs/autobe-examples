import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallOrderItemCancellationRequestCollector } from "../collectors/EcommerceMallOrderItemCancellationRequestCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminOrdersOrderIdCancel(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrder.ICancel;
}): Promise<IEcommerceMallOrder> {
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    ...EcommerceMallOrderTransformer.select(),
  });
  await Promise.all(
    order.orderItems.map(async (item) => {
      const cancellationData =
        await EcommerceMallOrderItemCancellationRequestCollector.collect({
          body: { reason: props.body.reason },
          ecommerceMallOrderItems: item,
        });
      await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.create(
        {
          data: cancellationData,
        },
      );
    }),
  );
  const updated = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow(
    {
      where: { id: props.orderId },
      ...EcommerceMallOrderTransformer.select(),
    },
  );
  return await EcommerceMallOrderTransformer.transform(updated);
}
