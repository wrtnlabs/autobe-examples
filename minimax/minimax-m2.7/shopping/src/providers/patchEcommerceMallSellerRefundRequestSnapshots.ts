import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRefundRequestSnapshots(props: {
  seller: SellerPayload;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput =
    {
      ecommerce_mall_seller_id: props.seller.id,
      ...(props.body.snapshot_status !== undefined && {
        snapshot_status: props.body.snapshot_status,
      }),
      ...(props.body.seller_response !== undefined && {
        seller_response: props.body.seller_response,
      }),
      ...(props.body.startDate !== undefined &&
        props.body.endDate !== undefined && {
          created_at: {
            gte: new Date(props.body.startDate),
            lte: new Date(props.body.endDate),
          },
        }),
      ...(props.body.startDate !== undefined &&
        props.body.endDate === undefined && {
          created_at: {
            gte: new Date(props.body.startDate),
          },
        }),
      ...(props.body.startDate === undefined &&
        props.body.endDate !== undefined && {
          created_at: {
            lte: new Date(props.body.endDate),
          },
        }),
    };
  const orderByField = (props.body.sortField ??
    "created_at") as keyof Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput;
  const orderByDirection = props.body.sortOrder ?? "desc";
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [orderByField]: orderByDirection,
      },
      ...EcommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereCondition,
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
      EcommerceMallRefundRequestSnapshotAtSummaryTransformer.transform,
    ),
  };
}
