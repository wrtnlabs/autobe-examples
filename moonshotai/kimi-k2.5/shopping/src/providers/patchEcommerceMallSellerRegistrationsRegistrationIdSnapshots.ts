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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRegistrationsRegistrationIdSnapshots(props: {
  seller: SellerPayload;
  registrationId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerRegistrationSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistrationSnapshot.ISummary> {
  // Verify registration exists
  await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow({
    where: { id: props.registrationId },
  });
  // Build where clause
  const where: Prisma.ecommerce_mall_seller_registration_snapshotsWhereInput = {
    ecommerce_mall_seller_registration_id: props.registrationId,
    ...(props.body.adminId !== null && {
      ecommerce_mall_admin_id: props.body.adminId,
    }),
    ...((props.body.createdAtFrom !== null ||
      props.body.createdAtTo !== null) && {
      created_at: {
        ...(props.body.createdAtFrom !== null && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo !== null && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
  };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Sort order
  const sortOrder = props.body.sort ?? "created_at_desc";
  const orderBy: Prisma.ecommerce_mall_seller_registration_snapshotsOrderByWithRelationInput =
    sortOrder === "created_at_asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Query data
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy,
        ...EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.select(),
      },
    );
  // Count total
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.count({
      where,
    });
  // Transform
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
