import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
import { EcommerceShipmentAtSummaryTransformer } from "../transformers/EcommerceShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceShipment.IRequest;
}): Promise<IPageIEcommerceShipment.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_shipmentsWhereInput = {
    deleted_at: null,
    ecommerce_order_id: props.orderId,
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.shippingDateFrom && {
      shipping_date: {
        gte: props.body.shippingDateFrom,
      },
    }),
    ...(props.body.shippingDateTo && {
      shipping_date: {
        lte: props.body.shippingDateTo,
      },
    }),
  };
  const data = await MyGlobal.prisma.ecommerce_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy: { shipping_date: "desc" },
    select: {
      id: true,
      carrier: true,
      tracking_number: true,
      shipping_date: true,
      estimated_delivery_date: true,
      status: true,
      deleted_at: true,
      actual_delivery_date: true,
      order: {
        select: {
          id: true,
          order_date: true,
          status: true,
          customer: {
            select: {
              id: true,
              email: true,
              display_name: true,
              phone: true,
              created_at: true,
            },
          },
        },
      },
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_shipments.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceShipmentAtSummaryTransformer.transform,
    ),
  };
}
