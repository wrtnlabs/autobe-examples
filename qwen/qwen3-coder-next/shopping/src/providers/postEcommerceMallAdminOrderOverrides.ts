import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderOverride";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { EcommerceMallOrderOverrideCollector } from "../collectors/EcommerceMallOrderOverrideCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderOverrideTransformer } from "../transformers/EcommerceMallOrderOverrideTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminOrderOverrides(props: {
  admin: AdminPayload;
  body: IEcommerceMallOrderOverride.ICreate;
}): Promise<IEcommerceMallOrderOverride> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.order_item_id },
      select: { id: true, order_id: true, seller_id: true },
    });
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.order_id },
    select: { id: true, customer_id: true },
  });
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: orderItem.seller_id },
      select: { id: true },
    },
  );
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: order.customer_id },
      select: { id: true },
    });
  const created = await MyGlobal.prisma.ecommerce_mall_order_overrides.create({
    data: await EcommerceMallOrderOverrideCollector.collect({
      body: props.body,
      ecommerceMallAdmins: { id: props.admin.id },
      ecommerceMallCustomers: { id: customer.id },
      ecommerceMallSellers: { id: seller.id },
      ecommerceMallOrders: { id: order.id },
      ecommerceMallOrderItems: { id: orderItem.id },
    }),
    ...EcommerceMallOrderOverrideTransformer.select(),
  });
  return await EcommerceMallOrderOverrideTransformer.transform(created);
}
