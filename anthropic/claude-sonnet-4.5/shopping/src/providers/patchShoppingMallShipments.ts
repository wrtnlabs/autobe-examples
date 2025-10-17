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

export async function patchShoppingMallShipments(props: {
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment> {
  const { body } = props;

  // Extract pagination parameters with defaults and strip brand types
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 50);
  const skip = (page - 1) * limit;

  // Build where clause for filtering - check both undefined AND null for required fields
  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipments.findMany({
      where: {
        ...(body.shipment_status !== undefined &&
          body.shipment_status !== null && {
            shipment_status: body.shipment_status,
          }),
        ...(body.carrier_name !== undefined &&
          body.carrier_name !== null && {
            carrier_name: {
              contains: body.carrier_name,
            },
          }),
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: limit,
      select: {
        id: true,
        tracking_number: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_shipments.count({
      where: {
        ...(body.shipment_status !== undefined &&
          body.shipment_status !== null && {
            shipment_status: body.shipment_status,
          }),
        ...(body.carrier_name !== undefined &&
          body.carrier_name !== null && {
            carrier_name: {
              contains: body.carrier_name,
            },
          }),
      },
    }),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(total / limit);

  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    },
    data: results.map((shipment) => ({
      id: shipment.id,
      tracking_number: shipment.tracking_number,
    })),
  };
}
