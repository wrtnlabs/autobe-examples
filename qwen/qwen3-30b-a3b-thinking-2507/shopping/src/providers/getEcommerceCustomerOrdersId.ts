import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceOrderTransformer } from "../transformers/EcommerceOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrder> {
  const result = await MyGlobal.prisma.ecommerce_orders.findUnique({
    where: { id: props.id, deleted_at: null },
    ...EcommerceOrderTransformer.select(),
  });
  if (!result) {
    throw new HttpException("Order not found", 404);
  }
  // Verify ownership for customer actors
  if (props.customer.type === "customer") {
    if (result.ecommerce_customers_id !== props.customer.id) {
      throw new HttpException("Order does not belong to this customer", 403);
    }
  }
  return await EcommerceOrderTransformer.transform(result);
}
