import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRequestSnapshot";
import { IShoppingMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequestSnapshot";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallAdminRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminRequestsAdminRequestIdSnapshots(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallAdminRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.shopping_mall_admin_requests.findUniqueOrThrow({
    where: { id: props.adminRequestId },
  });
  const sortField = props.body.sort?.split(",")[0] ?? "created_at";
  const sortDir = (props.body.sort?.split(",")[1] ?? "desc") as "asc" | "desc";
  const whereInput = {
    admin_request_id: props.adminRequestId,
  } satisfies Prisma.shopping_mall_admin_request_snapshotsWhereInput;
  const orderByInput = {
    [sortField]: sortDir,
  } satisfies Prisma.shopping_mall_admin_request_snapshotsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.shopping_mall_admin_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallAdminRequestSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_admin_request_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdminRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
