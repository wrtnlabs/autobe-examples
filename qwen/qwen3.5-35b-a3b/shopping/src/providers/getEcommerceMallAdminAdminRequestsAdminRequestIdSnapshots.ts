import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallAdminRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminRequestsAdminRequestIdSnapshots(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
}): Promise<IPageIEcommerceMallAdminRequestSnapshot.ISummary> {
  // Step 1: Verify admin request exists and get creator
  const adminRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findUnique({
      where: { id: props.adminRequestId },
      select: { ecommerce_mall_admin_id: true, deleted_at: true },
    });
  if (adminRequest === null) {
    throw new HttpException("Admin request not found", 404);
  }
  // Check if admin request was soft deleted
  if (adminRequest.deleted_at !== null) {
    throw new HttpException("Admin request has been deleted", 404);
  }
  // Step 2: Authorization check
  // Only the creator of the admin request can view snapshots
  const isCreator = props.admin.id === adminRequest.ecommerce_mall_admin_id;
  if (!isCreator) {
    throw new HttpException(
      "Forbidden: You do not have permission to view these snapshots",
      403,
    );
  }
  // Step 3: Query snapshots with pagination
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.findMany({
      where: {
        ecommerce_mall_admin_request_request_id: props.adminRequestId,
      },
      ...EcommerceMallAdminRequestSnapshotAtSummaryTransformer.select(),
      orderBy: { changed_at: "desc" },
      skip,
      take: limit,
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.count({
      where: {
        ecommerce_mall_admin_request_request_id: props.adminRequestId,
      },
    });
  // Step 4: Transform snapshots
  const transformedData = await ArrayUtil.asyncMap(snapshots, (snapshot) =>
    EcommerceMallAdminRequestSnapshotAtSummaryTransformer.transform(snapshot),
  );
  // Step 5: Return paginated result
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
