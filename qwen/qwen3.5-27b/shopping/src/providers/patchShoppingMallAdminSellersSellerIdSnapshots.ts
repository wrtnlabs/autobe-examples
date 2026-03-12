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

export async function patchShoppingMallAdminSellersSellerIdSnapshots(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApprovalSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerApprovalSnapshot.ISummary> {
  // Verify seller exists and is not deleted
  await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.shopping_mall_seller_approval_snapshotsWhereInput = {
    sellerApprovalRequest: {
      shopping_mall_seller_id: props.sellerId,
    },
  };
  // Apply date filters if provided
  if (props.body.created_at_from) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_from),
    };
  }
  if (props.body.created_at_to) {
    whereInput.created_at = {
      lte: new Date(props.body.created_at_to),
    };
  }
  // Determine sort order
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput = {
    created_at: sortOrder,
  } satisfies Prisma.shopping_mall_seller_approval_snapshotsOrderByWithRelationInput;
  // Fetch paginated snapshots
  const data =
    await MyGlobal.prisma.shopping_mall_seller_approval_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallSellerApprovalSnapshotAtSummaryTransformer.select(),
    });
  // Count total records for pagination
  const total =
    await MyGlobal.prisma.shopping_mall_seller_approval_snapshots.count({
      where: whereInput,
    });
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSellerApprovalSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
