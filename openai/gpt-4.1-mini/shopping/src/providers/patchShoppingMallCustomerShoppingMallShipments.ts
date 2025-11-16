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

export async function patchShoppingMallCustomerShoppingMallShipments(props: {
  customer: CustomerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null as null | undefined,
    ...(props.body.status != null ? { status: props.body.status } : {}),
    ...(props.body.order_id != null
      ? { shopping_mall_order_id: props.body.order_id }
      : {}),
    ...(props.body.shipping_method != null
      ? { shipping_method: props.body.shipping_method }
      : {}),
    ...(props.body.start_date != null || props.body.end_date != null
      ? {
          created_at: {
            ...(props.body.start_date != null
              ? { gte: props.body.start_date }
              : {}),
            ...(props.body.end_date != null
              ? { lte: props.body.end_date }
              : {}),
          },
        }
      : {}),
    ...(props.body.search != null
      ? {
          OR: [
            { status: { contains: props.body.search } },
            { shipping_method: { contains: props.body.search } },
            { tracking_number: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipments.findMany({
      where: where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_shipments.count({ where: where }),
  ]);

  return {
    data: data.map((shipment) => ({
      id: shipment.id,
      order_id: shipment.shopping_mall_order_id,
      status: shipment.status,
      shipping_method: shipment.shipping_method ?? undefined,
      tracking_number: shipment.tracking_number ?? null,
      shipping_address: "",
      shipped_at: "",
      updated_at: toISOStringSafe(shipment.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: shipment.deleted_at
        ? (toISOStringSafe(shipment.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    })),
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
