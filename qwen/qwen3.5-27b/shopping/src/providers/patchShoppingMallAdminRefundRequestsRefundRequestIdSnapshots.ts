import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundSnapshot";
import { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallRefundSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallRefundSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminRefundRequestsRefundRequestIdSnapshots(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput = (
    sortBy === "created_at"
      ? { created_at: sortOrder as "asc" | "desc" }
      : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_refund_snapshotsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_refund_snapshots.findMany({
    where: {
      shopping_mall_refund_request_id: props.refundRequestId,
    },
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallRefundSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_refund_snapshots.count({
    where: {
      shopping_mall_refund_request_id: props.refundRequestId,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallRefundSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
