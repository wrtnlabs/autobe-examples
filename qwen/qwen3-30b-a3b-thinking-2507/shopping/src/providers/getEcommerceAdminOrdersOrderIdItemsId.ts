import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceOrderItemTransformer } from "../transformers/EcommerceOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminOrdersOrderIdItemsId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderItem> {
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findUnique({
    where: {
      id: props.id,
      ecommerce_order_id: props.orderId,
    },
    ...EcommerceOrderItemTransformer.select(),
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  return await EcommerceOrderItemTransformer.transform(orderItem);
}
