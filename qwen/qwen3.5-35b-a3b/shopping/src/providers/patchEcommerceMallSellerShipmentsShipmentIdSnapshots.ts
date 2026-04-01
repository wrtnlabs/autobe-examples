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
  await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
    where: {
      id: props.shipmentId,
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
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
    ...(props.body.carrier_name !== undefined && {
      carrier_name: props.body.carrier_name,
    }),
  } satisfies Prisma.ecommerce_mall_shipment_snapshotsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_shipment_snapshotsOrderByWithRelationInput[] =
    props.body.sort !== undefined
      ? [
          {
            [props.body.sort]: props.body.order === "asc" ? "asc" : "desc",
          },
        ]
      : [{ created_at: "desc" }];
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
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
