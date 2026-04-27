import { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdminRegistrationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallAdminRegistrationRequestAtSummaryTransformer } from "../transformers/ECommerceMallAdminRegistrationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSellerAdminRegistrationRequests(props: {
  seller: SellerPayload;
  body: IECommerceMallAdminRegistrationRequest.IRequest;
}): Promise<IPageIECommerceMallAdminRegistrationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.e_commerce_mall_admin_registration_requestsWhereInput = {
    deleted_at: null,
    requester_type: "seller",
    adminRegistrationRequestSeller: {
      seller: {
        id: props.seller.id,
      },
    },
  };
  if (props.body.search !== undefined && props.body.search !== "") {
    where.reason = { contains: props.body.search, mode: "insensitive" };
  }
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  if (props.body.from !== undefined || props.body.to !== undefined) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.from !== undefined) {
      createdAtFilter.gte = props.body.from;
    }
    if (props.body.to !== undefined) {
      createdAtFilter.lte = props.body.to;
    }
    where.created_at = createdAtFilter;
  }
  const records =
    await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallAdminRegistrationRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.count({
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
      ECommerceMallAdminRegistrationRequestAtSummaryTransformer.transform,
    ),
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
// import { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
// import { IPageIECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdminRegistrationRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSellerAdminRegistrationRequests(props: {
//   seller: SellerPayload;
//   body: IECommerceMallAdminRegistrationRequest.IRequest;
// }): Promise<IPageIECommerceMallAdminRegistrationRequest.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.findMany({
//     ...ECommerceMallAdminRegistrationRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallAdminRegistrationRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------