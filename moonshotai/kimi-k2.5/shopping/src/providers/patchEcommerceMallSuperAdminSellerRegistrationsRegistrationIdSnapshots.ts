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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSellerRegistrationsRegistrationIdSnapshots(props: {
  superAdmin: SuperadminPayload;
  registrationId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerRegistrationSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistrationSnapshot.ISummary> {
  // Verify registration exists
  await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow({
    where: { id: props.registrationId },
  });
  // Build where clause with path registrationId and optional filters
  const whereInput = {
    ecommerce_mall_seller_registration_id: props.registrationId,
    ...(props.body.reviewerId
      ? { ecommerce_mall_admin_id: props.body.reviewerId }
      : {}),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom
              ? { gte: new Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo
              ? { lte: new Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_seller_registration_snapshotsWhereInput;
  // Determine sort field - validate against allowed columns
  const allowedSortFields = [
    "created_at",
    "id",
    "ecommerce_mall_seller_registration_id",
    "ecommerce_mall_admin_id",
  ] as const;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  // Build orderBy based on sort field
  const orderByInput: Prisma.ecommerce_mall_seller_registration_snapshotsOrderByWithRelationInput =
    sortBy === "ecommerce_mall_seller_registration_id"
      ? { ecommerce_mall_seller_registration_id: sortDirection }
      : sortBy === "ecommerce_mall_admin_id"
        ? { ecommerce_mall_admin_id: sortDirection }
        : { [sortBy]: sortDirection };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Execute findMany and count queries
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findMany(
      {
        where: whereInput,
        orderBy: orderByInput,
        skip,
        take: limit,
        ...EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.count({
      where: whereInput,
    });
  // Transform database results to DTO format
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
