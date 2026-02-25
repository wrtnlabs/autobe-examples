import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceRefundRequestCollector {
  export async function collect(props: {
    body: IEcommerceRefundRequest.ICreate;
    ecommerceCustomers: IEntity;
    ecommerceCustomerSessions: IEntity;
  }) {
    // Query the order item to get the seller reference
    const orderItem =
      await MyGlobal.prisma.ecommerce_order_items.findFirstOrThrow({
        where: { id: props.body.orderItemId },
        include: { seller: true },
      });
    const id: string = v4();
    const now = new Date();
    const refundWindowExpires = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000,
    ); // 7 days
    return {
      id,
      reason: props.body.reason,
      requested_at: now,
      refund_window_expires_at: refundWindowExpires,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      orderItem: { connect: { id: props.body.orderItemId } },
      customer: { connect: { id: props.ecommerceCustomers.id } },
      seller: { connect: { id: orderItem.seller.id } },
    } satisfies Prisma.ecommerce_refund_requestsCreateInput;
  }
}
