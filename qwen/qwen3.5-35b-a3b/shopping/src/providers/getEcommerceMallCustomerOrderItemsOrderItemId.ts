import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrderItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItem> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.orderItemId,
        deleted_at: null,
      },
      ...EcommerceMallOrderItemTransformer.select(),
    });
  if (props.customer.type === "customer") {
    const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
      where: {
        id: orderItem.order.id,
        customer_id: props.customer.id,
        deleted_at: null,
      },
    });
    if (order === null) {
      throw new HttpException("Forbidden", 403);
    }
  } else if (props.customer.type === "seller") {
    const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
      where: {
        id: orderItem.product.id,
        seller_id: props.customer.id,
      },
    });
    if (product === null) {
      throw new HttpException("Forbidden", 403);
    }
  } else {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallOrderItemTransformer.transform(orderItem);
}
