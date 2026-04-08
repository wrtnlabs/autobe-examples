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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestSnapshotTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRefundRequestsRefundRequestIdSnapshots(props: {
  seller: SellerPayload;
  refundRequestId: string;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot> {
  // Verify refund request exists and belongs to seller
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        orderItem: {
          seller_id: props.seller.id,
        },
      },
      select: {
        id: true,
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found or access denied", 404);
  }
  // Build where clause
  const whereInput = {
    refund_request_id: props.refundRequestId,
    ...(props.body.status !== null && { status: props.body.status }),
    ...(props.body.reason !== null &&
      props.body.reason !== undefined && {
        reason: { contains: props.body.reason },
      }),
    ...(props.body.responseReason !== null &&
      props.body.responseReason !== undefined && {
        response_reason: { contains: props.body.responseReason },
      }),
    ...(props.body.createdAtFrom !== null && props.body.createdAtTo !== null
      ? {
          created_at: {
            gte: new Date(props.body.createdAtFrom),
            lte: new Date(props.body.createdAtTo),
          },
        }
      : props.body.createdAtFrom !== null
        ? {
            created_at: {
              gte: new Date(props.body.createdAtFrom),
            },
          }
        : props.body.createdAtTo !== null
          ? {
              created_at: {
                lte: new Date(props.body.createdAtTo),
              },
            }
          : {}),
  } satisfies Prisma.ecommerce_mall_refund_request_snapshotsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Fetch data and count
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallRefundRequestSnapshotTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallRefundRequestSnapshotTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
