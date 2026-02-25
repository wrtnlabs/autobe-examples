import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
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
import { EcommerceOrderTransformer } from "../transformers/EcommerceOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersIdShipments(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IEcommerceShipment.IRequest;
}): Promise<IPageIEcommerceShipment.ISummary> {
  // Verify order ownership
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.id },
    select: { id: true, customer_id: true },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build shipment query with correct field names
  const whereInput = {
    order: { id: order.id },
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.carrierName && { carrier_name: props.body.carrierName }),
    deleted_at: null,
  } satisfies Prisma.ecommerce_shipmentsWhereInput;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.ecommerce_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      carrier_name: true,
      tracking_number: true,
      status: true,
      shipment_date: true,
      expected_delivery_date: true,
      created_at: true,
      order: EcommerceOrderTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.ecommerce_shipments.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(data, async (sh) => {
      return {
        id: sh.id,
        carrier_name: sh.carrier_name,
        tracking_number: sh.tracking_number,
        status: sh.status,
        shipment_date: sh.shipment_date.toISOString(),
        expected_delivery_date: sh.expected_delivery_date.toISOString(),
        created_at: sh.created_at.toISOString(),
        order: await EcommerceOrderTransformer.transform(sh.order),
      } satisfies IEcommerceShipment.ISummary;
    }),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIEcommerceShipment.ISummary;
}
