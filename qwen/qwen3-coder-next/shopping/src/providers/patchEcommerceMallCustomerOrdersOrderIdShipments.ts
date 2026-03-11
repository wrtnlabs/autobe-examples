import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceMallCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string;
  body?: {
    page?: number;
    limit?: number;
  };
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body?.page ?? 1;
  const limit = props.body?.limit ?? 20;
  const skip = (page - 1) * limit;
  const shipments = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: {
      ecommerce_mall_order_id: props.orderId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      tracking_number: true,
      carrier_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      ecommerce_mall_seller_id: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: {
      ecommerce_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  const data = await Promise.all(
    shipments.map(async (shipment) => {
      const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
        where: { id: shipment.ecommerce_mall_seller_id },
        select: {
          id: true,
          shop_name: true,
          approval_status: true,
          is_suspended: true,
          created_at: true,
        },
      });
      return {
        id: shipment.id as string & tags.Format<"uuid">,
        tracking_number: shipment.tracking_number as string | null,
        carrier_name: shipment.carrier_name as string | null,
        shipment_status: "pending" as string,
        created_at: toISOStringSafe(shipment.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(shipment.updated_at) as
          | (string & tags.Format<"date-time">)
          | undefined,
        deleted_at: shipment.deleted_at
          ? toISOStringSafe(shipment.deleted_at)
          : null,
        seller: {
          id: seller?.id as string & tags.Format<"uuid">,
          shop_name: seller?.shop_name ?? "",
          approval_status: seller?.approval_status ?? "pending",
          is_suspended: seller?.is_suspended ?? false,
          created_at: toISOStringSafe(
            seller?.created_at ?? new Date(),
          ) as string,
        },
      };
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
