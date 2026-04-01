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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallRefundRequestSnapshotTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminRefundRequestsRefundRequestIdSnapshots(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  const whereInput: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput = {
    refund_request_id: props.refundRequestId,
  };
  if (props.body.action_type !== undefined) {
    whereInput.action_type = props.body.action_type;
  }
  if (props.body.created_at_before !== undefined) {
    whereInput.created_at = {
      lte: new Date(props.body.created_at_before),
    } as Prisma.DateTimeFilter;
  }
  if (props.body.created_at_after !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_after),
    } as Prisma.DateTimeFilter;
  }
  if (props.body.status_before !== undefined) {
    whereInput.status_before = props.body.status_before;
  }
  if (props.body.status_after !== undefined) {
    whereInput.status_after = props.body.status_after;
  }
  const sortOrder = props.body.sort_order === "ASC" ? "asc" : "desc";
  const primarySortField = props.body.sort_by ?? "created_at";
  const orderByInput: Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput[] =
    [
      {
        [primarySortField]: sortOrder,
      },
    ];
  if (primarySortField !== "created_at") {
    orderByInput.push({
      created_at: sortOrder,
    });
  }
  const limit = props.body.limit ?? 50;
  const maxLimit = 100;
  if (limit < 1 || limit > maxLimit) {
    throw new HttpException("Invalid limit", 400);
  }
  let skip: number | undefined;
  let cursor:
    | Prisma.ecommerce_mall_refund_request_snapshotsWhereUniqueInput
    | undefined;
  if (props.body.page !== undefined && props.body.page !== null) {
    const page = props.body.page < 1 ? 1 : props.body.page;
    skip = (page - 1) * limit;
  } else if (props.body.cursor !== undefined) {
    cursor = {
      id: props.body.cursor,
    };
  }
  const baseQuery = {
    where: whereInput,
    orderBy: orderByInput,
    ...EcommerceMallRefundRequestSnapshotTransformer.select(),
  };
  const queryConfig =
    cursor !== undefined
      ? { ...baseQuery, skip: 1, take: limit + 1, cursor }
      : skip !== undefined
        ? { ...baseQuery, skip, take: limit }
        : { ...baseQuery, take: limit };
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany(
      queryConfig,
    );
  const isCursor = cursor !== undefined;
  const sliceIndex = isCursor && data.length > limit ? limit : data.length;
  const filteredData = data.slice(0, sliceIndex);
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  const page = props.body.page ?? 1;
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  const transformedData = await ArrayUtil.asyncMap(
    filteredData,
    async (item) =>
      await EcommerceMallRefundRequestSnapshotTransformer.transform(item),
  );
  return typia.assert<IPageIEcommerceMallRefundRequestSnapshot.ISummary>({
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  });
}
