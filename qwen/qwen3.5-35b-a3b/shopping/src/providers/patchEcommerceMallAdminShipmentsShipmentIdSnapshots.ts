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
import { EcommerceMallShipmentSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallShipmentSnapshotAtSummaryTransformer";
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
  const whereInput: Prisma.ecommerce_mall_shipment_snapshotsWhereInput = {
    ecommerce_mall_shipment_id: props.shipmentId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.carrier_name !== undefined && {
      carrier_name: props.body.carrier_name,
    }),
    ...(props.body.tracking_number !== undefined && {
      tracking_number: { contains: props.body.tracking_number },
    }),
    ...(props.body.created_date_from !== undefined && {
      created_at: { gte: new Date(props.body.created_date_from) },
    }),
    ...(props.body.created_date_to !== undefined && {
      created_at: { lte: new Date(props.body.created_date_to) },
    }),
  } satisfies Prisma.ecommerce_mall_shipment_snapshotsWhereInput;
  const orderByInput = (
    props.body.sort === "status" ||
    props.body.sort === "actual_delivery_date" ||
    props.body.sort === "shipped_date" ||
    props.body.sort === "estimated_delivery_date"
      ? { [props.body.sort]: (props.body.order ?? "desc") as Prisma.SortOrder }
      : {
          created_at: (props.body.order === "asc"
            ? "asc"
            : "desc") as Prisma.SortOrder,
        }
  ) satisfies Prisma.ecommerce_mall_shipment_snapshotsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_shipment_snapshots.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallShipmentSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_shipment_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallShipmentSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit) || (total === 0 ? 0 : 1),
    } satisfies IPage.IPagination,
  };
}
