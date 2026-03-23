import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminPromotionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionSnapshot";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminPromotionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminAtSummaryTransformer } from "../transformers/ShoppingMallAdminAtSummaryTransformer";
import { ShoppingMallAdminPromotionSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallAdminPromotionSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminPromotionRequestsRequestIdSnapshots(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminPromotionSnapshot.IRequest;
}): Promise<IPageIShoppingMallAdminPromotionSnapshot.ISummary> {
  // Validate the promotion request exists
  await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
    {
      where: {
        id: props.requestId,
        deleted_at: null,
      },
    },
  );
  // Authorization: super admin can view all, regular admin can only view their own
  const request =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
          deleted_at: null,
        },
        select: {
          shopping_mall_admin_id: true,
        },
      },
    );
  if (props.admin.id !== request.shopping_mall_admin_id) {
    const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findFirst({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
      select: {
        grade: true,
      },
    });
    if (adminRecord?.grade !== "super") {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Build WHERE clause with filters
  const whereInput: Prisma.shopping_mall_admin_promotion_snapshotsWhereInput = {
    shopping_mall_admin_promotion_request_id: props.requestId,
  };
  // Apply status filter if provided
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  // Apply submitted_at date range filters
  if (props.body.submittedAtFrom !== undefined) {
    whereInput.submitted_at = {
      gte: new Date(props.body.submittedAtFrom),
    };
  }
  if (props.body.submittedAtTo !== undefined) {
    if (whereInput.submitted_at === undefined) {
      whereInput.submitted_at = {};
    }
    (whereInput.submitted_at as Prisma.DateTimeFilter).lte = new Date(
      props.body.submittedAtTo,
    );
  }
  // Apply created_at date range filters
  if (props.body.createdAtFrom !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.createdAtFrom),
    };
  }
  if (props.body.createdAtTo !== undefined) {
    if (whereInput.created_at === undefined) {
      whereInput.created_at = {};
    }
    (whereInput.created_at as Prisma.DateTimeFilter).lte = new Date(
      props.body.createdAtTo,
    );
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build ORDER BY
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.shopping_mall_admin_promotion_snapshotsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    };
  // Query snapshots (without user relation since it doesn't exist in schema)
  const snapshots =
    await MyGlobal.prisma.shopping_mall_admin_promotion_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        user_id: true,
        reason: true,
        status: true,
        submitted_at: true,
        responded_at: true,
        created_at: true,
      },
    });
  // Count total records
  const total =
    await MyGlobal.prisma.shopping_mall_admin_promotion_snapshots.count({
      where: whereInput,
    });
  // Transform results - fetch user data separately for each snapshot
  const data = await ArrayUtil.asyncMap(snapshots, async (snapshot) => {
    const adminRecord =
      await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
        where: {
          id: snapshot.user_id,
        },
        ...ShoppingMallAdminAtSummaryTransformer.select(),
      });
    const user =
      await ShoppingMallAdminAtSummaryTransformer.transform(adminRecord);
    return await ShoppingMallAdminPromotionSnapshotAtSummaryTransformer.transform(
      snapshot,
      user,
    );
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
