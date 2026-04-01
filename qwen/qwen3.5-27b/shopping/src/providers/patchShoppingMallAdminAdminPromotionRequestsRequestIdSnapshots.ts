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
import { ShoppingMallAdminPromotionSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallAdminPromotionSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminPromotionRequestsRequestIdSnapshots(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminPromotionSnapshot.IRequest;
}): Promise<IPageIShoppingMallAdminPromotionSnapshot.ISummary> {
  const request =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_admin_id: true,
        },
      },
    );
  const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: {
      grade: true,
    },
  });
  if (adminRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    adminRecord.grade !== "super" &&
    request.shopping_mall_admin_id !== props.admin.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.shopping_mall_admin_promotion_snapshotsWhereInput = {
    shopping_mall_admin_promotion_request_id: props.requestId,
  };
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.submittedAtFrom !== undefined) {
    whereInput.submitted_at = {
      gte: new Date(props.body.submittedAtFrom),
    };
  }
  if (props.body.submittedAtTo !== undefined) {
    if (whereInput.submitted_at === undefined) {
      whereInput.submitted_at = {};
    }
    if (whereInput.submitted_at instanceof Object) {
      (whereInput.submitted_at as Prisma.DateTimeFilter).lte = new Date(
        props.body.submittedAtTo,
      );
    }
  }
  if (props.body.createdAtFrom !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.createdAtFrom),
    };
  }
  if (props.body.createdAtTo !== undefined) {
    if (whereInput.created_at === undefined) {
      whereInput.created_at = {};
    }
    if (whereInput.created_at instanceof Object) {
      (whereInput.created_at as Prisma.DateTimeFilter).lte = new Date(
        props.body.createdAtTo,
      );
    }
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.shopping_mall_admin_promotion_snapshotsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    };
  const data =
    await MyGlobal.prisma.shopping_mall_admin_promotion_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallAdminPromotionSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_admin_promotion_snapshots.count({
      where: whereInput,
    });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallAdminPromotionSnapshotAtSummaryTransformer.transform,
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
