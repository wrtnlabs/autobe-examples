import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;
  const body = props.body as Record<string, any>;
  let status: string | undefined = undefined;
  if ("status" in body && body.status !== undefined && body.status !== null) {
    status = body.status;
  }
  let createdAtFrom: Date | string | undefined = undefined;
  if (
    "createdAtFrom" in body &&
    body.createdAtFrom !== undefined &&
    body.createdAtFrom !== null
  ) {
    createdAtFrom = body.createdAtFrom;
  }
  let createdAtTo: Date | string | undefined = undefined;
  if (
    "createdAtTo" in body &&
    body.createdAtTo !== undefined &&
    body.createdAtTo !== null
  ) {
    createdAtTo = body.createdAtTo;
  }
  const where: Prisma.shopping_mall_shipmentsWhereInput = {
    seller_id: props.seller.id,
    deleted_at: null,
    ...(status ? { status: status } : {}),
    ...(createdAtFrom ? { created_at: { gte: createdAtFrom } } : {}),
    ...(createdAtTo
      ? {
          created_at: {
            ...((createdAtFrom && { gte: createdAtFrom }) ?? {}),
            lte: createdAtTo,
          },
        }
      : {}),
  };
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { status: "asc" }],
    select: {
      id: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      seller: {
        select: {
          id: true,
          email: true,
          shop_name: true,
          shop_description: true,
          logo_uri: true,
          approval_status: true,
          rejection_reason: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({ where });
  const shipments: IShoppingMallShipment.ISummary[] = data.map((shipment) => ({
    id: shipment.id,
    status: shipment.status,
    createdAt: toISOStringSafe(shipment.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(shipment.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt: shipment.deleted_at
      ? (toISOStringSafe(shipment.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
    seller: {
      id: shipment.seller.id,
      email: shipment.seller.email,
      shopName: shipment.seller.shop_name,
      shopDescription: shipment.seller.shop_description ?? null,
      logoUri: shipment.seller.logo_uri ?? null,
      approvalStatus: shipment.seller.approval_status,
      rejectionReason: shipment.seller.rejection_reason ?? null,
    },
  }));
  return {
    data: shipments,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
