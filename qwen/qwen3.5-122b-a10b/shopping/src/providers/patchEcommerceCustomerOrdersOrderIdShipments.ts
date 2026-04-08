import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceShipmentAtSummaryTransformer } from "../transformers/EcommerceShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceShipment.IRequest;
}): Promise<IPageIEcommerceShipment.ISummary> {
  // Validate order exists and customer owns it
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { ecommerce_customer_id: true },
  });
  if (order.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_shipmentsWhereInput = {
    order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.carrier_name && {
      carrier_name: { contains: props.body.carrier_name },
    }),
  } satisfies Prisma.ecommerce_shipmentsWhereInput;
  // Query shipments
  const records = await MyGlobal.prisma.ecommerce_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceShipmentAtSummaryTransformer.select(),
  } satisfies Prisma.ecommerce_shipmentsFindManyArgs);
  // Count total
  const total = await MyGlobal.prisma.ecommerce_shipments.count({
    where: whereInput,
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceShipmentAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceShipment.ISummary;
}
