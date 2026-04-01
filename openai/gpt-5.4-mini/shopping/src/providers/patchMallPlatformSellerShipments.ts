import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerShipments(props: {
  seller: SellerPayload;
  body: IMallPlatformShipment.IRequest;
}): Promise<IPageIMallPlatformShipment> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_shipmentsWhereInput = {
    deleted_at: null,
    mall_platform_seller_id: props.seller.id,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.orderId !== undefined
      ? { mall_platform_order_id: props.body.orderId }
      : {}),
    ...(props.body.trackingNumber !== undefined
      ? { tracking_number: props.body.trackingNumber }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: new globalThis.Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: new globalThis.Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.shippedAtFrom !== undefined ||
    props.body.shippedAtTo !== undefined
      ? {
          shipped_at: {
            ...(props.body.shippedAtFrom !== undefined
              ? { gte: new globalThis.Date(props.body.shippedAtFrom) }
              : {}),
            ...(props.body.shippedAtTo !== undefined
              ? { lte: new globalThis.Date(props.body.shippedAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              carrier_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              tracking_number: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              order: {
                order_number: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            },
            {
              seller: {
                email: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.mall_platform_shipmentsOrderByWithRelationInput =
    props.body.sort === "createdAtAsc"
      ? { created_at: "asc" }
      : props.body.sort === "shippedAtAsc"
        ? { shipped_at: "asc" }
        : props.body.sort === "shippedAtDesc"
          ? { shipped_at: "desc" }
          : { created_at: "desc" };
  const data = await MyGlobal.prisma.mall_platform_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...MallPlatformShipmentTransformer.select(),
  });
  const records = await MyGlobal.prisma.mall_platform_shipments.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MallPlatformShipmentTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
