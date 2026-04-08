import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestSnapshotTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerRefundRequestsRefundRequestIdSnapshots(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot> {
  await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirstOrThrow({
    where: {
      id: props.refundRequestId,
      orderItem: {
        order: {
          customer: {
            id: props.customer.id,
          },
        },
      },
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const whereInput = {
    refund_request_id: props.refundRequestId,
    ...(props.body.status !== null && { status: props.body.status }),
    ...(props.body.reason !== null && {
      reason: { contains: props.body.reason },
    }),
    ...(props.body.responseReason !== null && {
      response_reason: { contains: props.body.responseReason },
    }),
    ...(props.body.createdAtFrom !== null || props.body.createdAtTo !== null
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== null && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== null && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_refund_request_snapshotsWhereInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallRefundRequestSnapshotTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallRefundRequestSnapshotTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
