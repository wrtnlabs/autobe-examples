import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceOrderItemTransformer } from "../transformers/EcommerceOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersOrderIdItemsItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderItem> {
  const order = await MyGlobal.prisma.ecommerce_orders.findFirst({
    where: {
      id: props.orderId,
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (order === null) {
    throw new HttpException("Order not found or access denied", 404);
  }
  const item = await MyGlobal.prisma.ecommerce_order_items.findFirst({
    where: {
      id: props.itemId,
      ecommerce_order_id: props.orderId,
      deleted_at: null,
    },
    ...EcommerceOrderItemTransformer.select(),
  });
  if (item === null) {
    throw new HttpException("Order item not found", 404);
  }
  return await EcommerceOrderItemTransformer.transform(item);
}
