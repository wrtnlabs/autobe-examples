import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistrationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellerRegistrationsRegistrationIdSnapshots(props: {
  admin: AdminPayload;
  registrationId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerRegistrationSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistrationSnapshot.ISummary> {
  // Verify registration exists
  await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow({
    where: { id: props.registrationId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  // Build where conditions
  const whereConditions: Prisma.ecommerce_mall_seller_registration_snapshotsWhereInput =
    {
      ecommerce_mall_seller_registration_id: props.registrationId,
    };
  // Add reviewer filter if provided
  if (props.body.reviewerId !== undefined && props.body.reviewerId !== null) {
    whereConditions.ecommerce_mall_admin_id = props.body.reviewerId;
  }
  // Handle created_at date range - inline checks for proper type narrowing
  const from = props.body.createdAtFrom;
  const to = props.body.createdAtTo;
  if (from !== undefined && from !== null && to !== undefined && to !== null) {
    whereConditions.created_at = {
      gte: new Date(from),
      lte: new Date(to),
    };
  } else if (from !== undefined && from !== null) {
    whereConditions.created_at = {
      gte: new Date(from),
    };
  } else if (to !== undefined && to !== null) {
    whereConditions.created_at = {
      lte: new Date(to),
    };
  }
  // Get total count - fix Prisma property name to snake_case
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.count({
      where: whereConditions,
    });
  // Get paginated data
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findMany(
      {
        where: whereConditions,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDirection },
        ...EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.select(),
      },
    );
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
