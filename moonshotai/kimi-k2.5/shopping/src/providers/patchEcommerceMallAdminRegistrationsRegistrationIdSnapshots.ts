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
  registrationId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerRegistrationSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistrationSnapshot.ISummary> {
  await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow({
    where: { id: props.registrationId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereCreatedAt = {
    ...(props.body.createdAtFrom !== undefined &&
      props.body.createdAtFrom !== null && {
        gte: new Date(props.body.createdAtFrom),
      }),
    ...(props.body.createdAtTo !== undefined &&
      props.body.createdAtTo !== null && {
        lte: new Date(props.body.createdAtTo),
      }),
  };
  const where: Prisma.ecommerce_mall_seller_registration_snapshotsWhereInput = {
    ecommerce_mall_seller_registration_id: props.registrationId,
    ...(props.body.adminId !== undefined &&
      props.body.adminId !== null && {
        ecommerce_mall_admin_id: props.body.adminId,
      }),
    ...(Object.keys(whereCreatedAt).length > 0 && {
      created_at: whereCreatedAt,
    }),
  };
  const orderBy: Prisma.ecommerce_mall_seller_registration_snapshotsOrderByWithRelationInput =
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const records =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy,
        ...EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallSellerRegistrationSnapshot.ISummary;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
// import { IPageIEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistrationSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminRegistrationsRegistrationIdSnapshots(props: {
//   admin: AdminPayload;
//   registrationId: string;
//   body: IEcommerceMallSellerRegistrationSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallSellerRegistrationSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findMany({
//     ...EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------