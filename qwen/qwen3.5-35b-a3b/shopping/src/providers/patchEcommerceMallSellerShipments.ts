import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const pageStr = props.body.page ?? "1";
  const page =
    Number.parseInt(pageStr, 10) >= 1 ? Number.parseInt(pageStr, 10) : 1;
  const limit = (() => {
    const raw = props.body.limit ?? 20;
    if (raw < 10) return 10;
    if (raw > 100) return 100;
    return raw;
  })();
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    deleted_at: null,
    ...(props.body.trackingNumber !== undefined && {
      tracking_number: { contains: props.body.trackingNumber },
    }),
    ...(props.body.createdAfter !== undefined && {
      created_at: {
        gte: props.body.createdAfter,
      },
    }),
    ...(props.body.createdBefore !== undefined && {
      created_at: {
        lte: props.body.createdBefore,
      },
    }),
    ...(props.body.orderId !== undefined && {
      order_id: props.body.orderId,
    }),
    seller_id: props.seller.id,
  } satisfies Prisma.ecommerce_mall_shipmentsWhereInput;
  const orderByInput =
    sortBy === "sellerId"
      ? { seller_id: sortOrder as "asc" | "desc" }
      : sortBy === "trackingNumber"
        ? { tracking_number: sortOrder as "asc" | "desc" }
        : { created_at: sortOrder as "asc" | "desc" };
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
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
