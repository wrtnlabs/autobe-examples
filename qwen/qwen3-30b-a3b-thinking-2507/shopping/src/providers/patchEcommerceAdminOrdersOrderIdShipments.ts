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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceShipmentAtSummaryTransformer } from "../transformers/EcommerceShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminOrdersOrderIdShipments(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceShipment.IRequest;
}): Promise<IPageIEcommerceShipment.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_shipmentsWhereInput = {
    ecommerce_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.shippingDateFrom && {
      shipping_date: { gte: props.body.shippingDateFrom },
    }),
    ...(props.body.shippingDateTo && {
      shipping_date: { lte: props.body.shippingDateTo },
    }),
  };
  const data = await MyGlobal.prisma.ecommerce_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy: { shipping_date: "desc" },
    ...EcommerceShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_shipments.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
