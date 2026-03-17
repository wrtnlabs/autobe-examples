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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellerRegistrationsRegistrationIdSnapshots(props: {
  seller: SellerPayload;
  registrationId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerRegistrationSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistrationSnapshot.ISummary> {
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.registrationId },
        select: { seller_id: true },
      },
    );
  if (registration.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    createdAtFilter.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    createdAtFilter.lte = new Date(props.body.createdAtTo);
  }
  const whereInput = {
    ecommerce_mall_seller_registration_id: props.registrationId,
    ...(props.body.reviewerId !== undefined && props.body.reviewerId !== null
      ? { ecommerce_mall_admin_id: props.body.reviewerId }
      : {}),
    ...(Object.keys(createdAtFilter).length > 0
      ? { created_at: createdAtFilter }
      : {}),
  } satisfies Prisma.ecommerce_mall_seller_registration_snapshotsWhereInput;
  const orderByInput = (
    props.body.sortBy === "id"
      ? { id: (props.body.sortDirection ?? "desc") as "asc" | "desc" }
      : props.body.sortBy === "ecommerce_mall_seller_registration_id"
        ? {
            ecommerce_mall_seller_registration_id: (props.body.sortDirection ??
              "desc") as "asc" | "desc",
          }
        : props.body.sortBy === "ecommerce_mall_admin_id"
          ? {
              ecommerce_mall_admin_id: (props.body.sortDirection ?? "desc") as
                | "asc"
                | "desc",
            }
          : {
              created_at: (props.body.sortDirection ?? "desc") as
                | "asc"
                | "desc",
            }
  ) satisfies Prisma.ecommerce_mall_seller_registration_snapshotsOrderByWithRelationInput;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
