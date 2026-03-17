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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallShipmentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerShipmentsShipmentIdSnapshots(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentSnapshot.IRequest;
}): Promise<IPageIEcommerceMallShipmentSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
    where: {
      id: props.shipmentId,
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  const whereInput: Prisma.ecommerce_mall_shipment_snapshotsWhereInput = {
    ecommerce_mall_shipment_id: props.shipmentId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.created_date_from !== undefined && {
      created_at: { gte: new Date(props.body.created_date_from) },
    }),
    ...(props.body.created_date_to !== undefined && {
      created_at: { lte: new Date(props.body.created_date_to) },
    }),
    ...(props.body.tracking_number !== undefined && {
      tracking_number: {
        contains: props.body.tracking_number,
        mode: "insensitive",
      },
    }),
    ...(props.body.carrier_name !== undefined &&
      props.body.carrier_name !== null && {
        carrier_name: props.body.carrier_name,
      }),
  } satisfies Prisma.ecommerce_mall_shipment_snapshotsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_shipment_snapshots.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        created_at: props.body.order === "asc" ? "asc" : "desc",
      },
      ...EcommerceMallShipmentSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_shipment_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallShipmentSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallShipmentSnapshot.ISummary;
}
