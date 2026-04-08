import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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

export async function patchEcommerceMallAdminRegistrationsRegistrationIdSnapshots(props: {
  admin: AdminPayload;
  registrationId: string;
  body: IEcommerceMallSellerRegistrationSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistrationSnapshot.ISummary> {
  // Verify the registration exists
  await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow({
    where: { id: props.registrationId },
    select: { id: true },
  });
  // Build pagination
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 10;
  const skip: number = (page - 1) * limit;
  // Build where conditions
  const where: Prisma.ecommerce_mall_seller_registration_snapshotsWhereInput = {
    ecommerce_mall_seller_registration_id: props.registrationId,
    ...(props.body.adminId && {
      ecommerce_mall_admin_id: props.body.adminId,
    }),
    created_at: {
      ...(props.body.createdAtFrom && {
        gte: new Date(props.body.createdAtFrom),
      }),
      ...(props.body.createdAtTo && { lte: new Date(props.body.createdAtTo) }),
    },
  };
  // Build orderBy
  const orderBy: Prisma.ecommerce_mall_seller_registration_snapshotsOrderByWithRelationInput =
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Query snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy,
        ...EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.select(),
      },
    );
  // Count totals
  const total: number =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.count({
      where,
    });
  // Transform results
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
  } satisfies IPageIEcommerceMallSellerRegistrationSnapshot.ISummary;
}
