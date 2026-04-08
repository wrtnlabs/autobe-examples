import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminAdminRequests(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdminRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_admin_requestsWhereInput = {
    deleted_at: null,
  };
  if (props.body.status != null) {
    whereInput.status = props.body.status;
  }
  if (props.body.actorType != null) {
    whereInput.actor_type = props.body.actorType;
  }
  if (props.body.requestedGrade != null) {
    whereInput.requested_grade = props.body.requestedGrade;
  }
  if (props.body.reviewedById != null) {
    whereInput.reviewed_by_id = props.body.reviewedById;
  }
  if (props.body.createdAtFrom != null || props.body.createdAtTo != null) {
    const dateFilter: Prisma.DateTimeFilter | Record<string, unknown> = {};
    if (props.body.createdAtFrom != null) {
      (
        dateFilter as {
          gte?: string;
        }
      ).gte = props.body.createdAtFrom;
    }
    if (props.body.createdAtTo != null) {
      (
        dateFilter as {
          lte?: string;
        }
      ).lte = props.body.createdAtTo;
    }
    whereInput.created_at = dateFilter as Prisma.DateTimeFilter;
  }
  const records = await MyGlobal.prisma.ecommerce_mall_admin_requests.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    ...EcommerceMallAdminRequestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admin_requests.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallAdminRequestAtSummaryTransformer.transform,
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
// import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
// import { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminAdminAdminRequests(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallAdminRequest.IRequest;
// }): Promise<IPageIEcommerceMallAdminRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admin_requests.findMany({
//     ...EcommerceMallAdminRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------