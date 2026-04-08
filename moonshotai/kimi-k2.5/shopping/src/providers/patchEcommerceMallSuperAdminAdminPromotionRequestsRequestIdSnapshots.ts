import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminPromotionRequestsRequestIdSnapshots(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminPromotionRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequestSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_admin_promotion_request_snapshotsWhereInput =
    {
      admin_promotion_request_id: props.requestId,
    };
  if (props.body.previous_status !== undefined) {
    where.previous_status = props.body.previous_status;
  }
  if (props.body.new_status !== undefined) {
    where.new_status = props.body.new_status;
  }
  if (props.body.previous_reviewer_id !== undefined) {
    where.previous_reviewer_id = props.body.previous_reviewer_id;
  }
  if (props.body.new_reviewer_id !== undefined) {
    where.new_reviewer_id = props.body.new_reviewer_id;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_from !== undefined) {
      createdAtFilter.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== undefined) {
      createdAtFilter.lte = new Date(props.body.created_at_to);
    }
    where.created_at = createdAtFilter;
  }
  const records =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.count(
      { where },
    );
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
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
// import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
// import { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminAdminPromotionRequestsRequestIdSnapshots(props: {
//   superAdmin: SuperadminPayload;
//   requestId: string;
//   body: IEcommerceMallAdminPromotionRequestSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallAdminPromotionRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.findMany({
//     ...EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------