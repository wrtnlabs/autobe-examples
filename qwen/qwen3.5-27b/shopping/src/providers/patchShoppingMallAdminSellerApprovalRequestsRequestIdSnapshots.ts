import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalSnapshot";
import { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerApprovalSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallSellerApprovalSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSellerApprovalRequestsRequestIdSnapshots(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApprovalSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerApprovalSnapshot.ISummary> {
  // Validate the seller approval request exists
  await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
    {
      where: {
        id: props.requestId,
        deleted_at: null,
      },
    },
  );
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    shopping_mall_seller_approval_request_id: props.requestId,
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.shopping_mall_seller_approval_snapshotsWhereInput;
  // Build order by clause
  const orderByInput = (
    props.body.sort_order === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_seller_approval_snapshotsOrderByWithRelationInput;
  // Query snapshots
  const data =
    await MyGlobal.prisma.shopping_mall_seller_approval_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallSellerApprovalSnapshotAtSummaryTransformer.select(),
    });
  // Count total for pagination
  const total =
    await MyGlobal.prisma.shopping_mall_seller_approval_snapshots.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallSellerApprovalSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
