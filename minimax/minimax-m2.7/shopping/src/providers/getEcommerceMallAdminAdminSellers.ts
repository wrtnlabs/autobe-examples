import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminSellers(props: {
  admin: AdminPayload;
  page?: number;
  limit?: number;
  approvalStatus?: string;
  suspensionStatus?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const page = props.page ?? 1;
  const limit = Math.min(props.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereApproval = props.approvalStatus
    ? { approval_status: props.approvalStatus }
    : {};
  const whereSuspension = (() => {
    if (!props.suspensionStatus) return {};
    if (props.suspensionStatus === "active") {
      return {
        sellerSuspensions: {
          none: {
            restored_at: null,
          },
        },
      };
    }
    return {
      sellerSuspensions: {
        some: {
          restored_at: null,
        },
      },
    };
  })();
  const whereClause = {
    deleted_at: null,
    ...whereApproval,
    ...whereSuspension,
  } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  const orderByClause = (() => {
    const sortBy = props.sortBy ?? "createdAt";
    const sortOrder = props.sortOrder ?? "desc";
    const order = sortOrder === "asc" ? ("asc" as const) : ("desc" as const);
    if (sortBy === "email") {
      return {
        email: order,
      } satisfies Prisma.ecommerce_mall_sellersOrderByWithRelationInput;
    }
    return {
      created_at: order,
    } satisfies Prisma.ecommerce_mall_sellersOrderByWithRelationInput;
  })();
  const records = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip: skip,
    take: limit,
    ...EcommerceMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: whereClause,
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
      EcommerceMallSellerAtSummaryTransformer.transform,
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
// import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminAdminSellers(props: {
//   admin: AdminPayload;
// }): Promise<IPageIEcommerceMallSeller.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
//     ...EcommerceMallSellerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------