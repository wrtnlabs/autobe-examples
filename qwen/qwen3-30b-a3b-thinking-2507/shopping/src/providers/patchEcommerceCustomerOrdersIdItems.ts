import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceProductVariantTransformer } from "../transformers/EcommerceProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersIdItems(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IEcommerceOrderItem.IRequest;
}): Promise<IPageIEcommerceOrderItem.ISummary> {
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.id, customer_id: props.customer.id },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: {
      order_id: props.id,
      ...props.body.filters,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      quantity: true,
      price: true,
      status: true,
      created_at: true,
      variant: EcommerceProductVariantTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.ecommerce_order_items.count({
    where: {
      order_id: props.id,
      ...props.body.filters,
    },
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (item) => ({
    id: item.id as string & tags.Format<"uuid">,
    quantity: item.quantity,
    price: item.price,
    status: typia.assert<
      "shipped" | "delivered" | "cancelled" | "paid" | "refunded"
    >(item.status),
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
    variant: await EcommerceProductVariantTransformer.transform(item.variant),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
