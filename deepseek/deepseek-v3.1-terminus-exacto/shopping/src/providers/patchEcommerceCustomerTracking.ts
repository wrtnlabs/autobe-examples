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

export async function patchEcommerceCustomerTracking(props: {
  customer: CustomerPayload;
  body: IEcommerceShipment.IRequest;
}): Promise<IPageIEcommerceShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper Prisma syntax
  const whereInput = {
    shipmentItems: {
      some: {
        orderItem: {
          order: {
            customer_id: props.customer.id,
          },
        },
      },
    },
    ...(props.body.tracking_number && {
      tracking_number: { contains: props.body.tracking_number },
    }),
    ...(props.body.carrier_name && {
      carrier_name: { contains: props.body.carrier_name },
    }),
    ...(props.body.shipment_status && {
      shipment_status: props.body.shipment_status,
    }),
    ...(props.body.created_at_min && {
      created_at: { gte: new Date(props.body.created_at_min) },
    }),
    ...(props.body.created_at_max && {
      created_at: { lte: new Date(props.body.created_at_max) },
    }),
  } satisfies Prisma.ecommerce_shipmentsWhereInput;
  // Get paginated data
  const data = await MyGlobal.prisma.ecommerce_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceShipmentAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_shipments.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceShipmentAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
