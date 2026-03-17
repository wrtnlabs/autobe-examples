import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminShipments(props: {
  admin: AdminPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const shippedAtFilter = (() => {
    if (props.body.shippedAtFrom && props.body.shippedAtTo) {
      return {
        gte: new Date(props.body.shippedAtFrom),
        lte: new Date(props.body.shippedAtTo),
      };
    }
    if (props.body.shippedAtFrom) {
      return { gte: new Date(props.body.shippedAtFrom) };
    }
    if (props.body.shippedAtTo) {
      return { lte: new Date(props.body.shippedAtTo) };
    }
    return undefined;
  })();
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    deleted_at: null,
    ...(props.body.orderId && { order_id: props.body.orderId }),
    ...(props.body.sellerId && { seller_id: props.body.sellerId }),
    ...(props.body.carrierName && {
      carrier_name: { contains: props.body.carrierName, mode: "insensitive" },
    }),
    ...(props.body.trackingNumber && {
      tracking_number: {
        contains: props.body.trackingNumber,
        mode: "insensitive",
      },
    }),
    ...(shippedAtFilter && { shipped_at: shippedAtFilter }),
  };
  const orderByInput: Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput =
    (() => {
      if (!props.body.sort || props.body.sort.length === 0) {
        return { shipped_at: "desc" };
      }
      const sortField = props.body.sort[0];
      const direction = sortField.startsWith("-") ? "desc" : "asc";
      const field = sortField.replace(/^[+-]/, "");
      const fieldMap: Record<
        string,
        keyof Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput
      > = {
        shippedAt: "shipped_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      };
      return { [fieldMap[field] ?? field]: direction };
    })();
  const data = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
