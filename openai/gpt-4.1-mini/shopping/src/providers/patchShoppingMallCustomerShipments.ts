import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShipments(props: {
  customer: CustomerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const {
    page,
    limit,
    search,
    shipping_carrier,
    tracking_number,
    shipment_status,
    shipped_at_from,
    shipped_at_to,
    delivered_at_from,
    delivered_at_to,
  } = props.body;

  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    shopping_mall_order: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    ...(shipping_carrier ? { shipping_carrier } : {}),
    ...(tracking_number ? { tracking_number } : {}),
    ...(shipment_status ? { shipment_status } : {}),
    ...(search
      ? {
          OR: [
            { tracking_number: { contains: search } },
            { shipping_carrier: { contains: search } },
            { shipment_status: { contains: search } },
          ],
        }
      : {}),
    ...(shipped_at_from || shipped_at_to
      ? {
          shipped_at: {
            ...(shipped_at_from ? { gte: shipped_at_from } : {}),
            ...(shipped_at_to ? { lte: shipped_at_to } : {}),
          },
        }
      : {}),
    ...(delivered_at_from || delivered_at_to
      ? {
          delivered_at: {
            ...(delivered_at_from ? { gte: delivered_at_from } : {}),
            ...(delivered_at_to ? { lte: delivered_at_to } : {}),
          },
        }
      : {}),
  };

  const [shipments, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipments.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_shipments.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: shipments.map(
      (shipment): IShoppingMallShipment.ISummary => ({
        id: shipment.id,
        shopping_mall_order_id: shipment.shopping_mall_order_id,
        shipment_status: shipment.shipment_status,
        shipped_at:
          shipment.shipped_at === null
            ? undefined
            : toISOStringSafe(shipment.shipped_at),
        tracking_number:
          shipment.tracking_number === null
            ? undefined
            : shipment.tracking_number,
      }),
    ),
  };
}
