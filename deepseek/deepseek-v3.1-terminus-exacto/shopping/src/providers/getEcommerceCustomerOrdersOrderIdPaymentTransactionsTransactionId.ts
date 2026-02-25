import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePaymentTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePaymentTransactionTransformer } from "../transformers/EcommercePaymentTransactionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersOrderIdPaymentTransactionsTransactionId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
}): Promise<IEcommercePaymentTransaction> {
  // First verify the order exists and belongs to the customer
  await MyGlobal.prisma.ecommerce_orders.findFirstOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
    },
    select: { id: true },
  });
  const transaction =
    await MyGlobal.prisma.ecommerce_payment_transactions.findFirstOrThrow({
      where: {
        id: props.transactionId,
        order_id: props.orderId,
      },
      ...EcommercePaymentTransactionTransformer.select(),
    });
  return await EcommercePaymentTransactionTransformer.transform(transaction);
}
