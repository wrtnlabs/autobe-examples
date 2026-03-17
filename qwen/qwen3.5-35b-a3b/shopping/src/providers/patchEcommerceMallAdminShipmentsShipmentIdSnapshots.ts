import { IEcommerceMallShipmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminShipmentsShipmentIdSnapshots(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentSnapshot.IRequest;
}): Promise<IPageIEcommerceMallShipmentSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build filter where clause
  const whereInput: Prisma.ecommerce_mall_shipment_snapshotsWhereInput = {
    ecommerce_mall_shipment_id: props.shipmentId,
  };
  // Apply optional filters
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (
    props.body.created_date_from !== undefined ||
    props.body.created_date_to !== undefined
  ) {
    whereInput.created_at = {
      ...(props.body.created_date_from !== undefined && {
        gte: new Date(props.body.created_date_from),
      }),
      ...(props.body.created_date_to !== undefined && {
        lte: new Date(props.body.created_date_to),
      }),
    };
  }
  if (props.body.tracking_number !== undefined) {
    whereInput.tracking_number = {
      contains: props.body.tracking_number,
      mode: "insensitive",
    };
  }
  if (
    props.body.carrier_name !== null &&
    props.body.carrier_name !== undefined
  ) {
    whereInput.carrier_name = props.body.carrier_name;
  }
  // Build order by clause
  const orderByInput: Prisma.ecommerce_mall_shipment_snapshotsOrderByWithRelationInput[] =
    [];
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  switch (sortField) {
    case "status":
      orderByInput.push({ status: sortOrder });
      break;
    case "shipped_date":
      orderByInput.push({
        shipped_date: sortOrder,
      });
      break;
    case "actual_delivery_date":
      orderByInput.push({
        actual_delivery_date: sortOrder,
      });
      break;
    case "created_at":
    default:
      orderByInput.push({ created_at: sortOrder });
      break;
  }
  // Query records
  const data = await MyGlobal.prisma.ecommerce_mall_shipment_snapshots.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        tracking_number: true,
        carrier_name: true,
        status: true,
        estimated_delivery_date: true,
        actual_delivery_date: true,
        ecommerce_mall_shipment_id: true,
        created_at: true,
      },
    },
  );
  // Query total count
  const total = await MyGlobal.prisma.ecommerce_mall_shipment_snapshots.count({
    where: whereInput,
  });
  // Transform to ISummary
  const transformedData = data.map(
    (snapshot) =>
      ({
        id: snapshot.id as string & tags.Format<"uuid">,
        tracking_number: snapshot.tracking_number,
        carrier_name: snapshot.carrier_name,
        status: snapshot.status,
        estimated_delivery_date: snapshot.estimated_delivery_date
          ? toISOStringSafe(snapshot.estimated_delivery_date)
          : null,
        actual_delivery_date: snapshot.actual_delivery_date
          ? toISOStringSafe(snapshot.actual_delivery_date)
          : null,
        ecommerce_mall_shipment_id:
          snapshot.ecommerce_mall_shipment_id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(snapshot.created_at),
      }) satisfies IEcommerceMallShipmentSnapshot.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallShipmentSnapshot.ISummary;
}
