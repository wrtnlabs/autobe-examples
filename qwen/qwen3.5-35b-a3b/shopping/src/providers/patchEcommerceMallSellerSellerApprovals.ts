import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerApprovalRequestAtSummaryTransformer } from "../transformers/EcommerceMallSellerApprovalRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellerApprovals(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerApprovalRequest.IRequest;
}): Promise<IPageIEcommerceMallSellerApprovalRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate pagination parameters
  if (page < 1 || page > 1000000) {
    throw new HttpException("Invalid page number", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Invalid limit", 400);
  }
  // Build where clause for filtering
  const whereInput: Prisma.ecommerce_mall_seller_approval_requestsWhereInput = {
    deleted_at: null,
  };
  // Apply status filter
  if (props.body.status && props.body.status.length > 0) {
    whereInput.status = {
      in: props.body.status,
    };
  }
  // Apply date range filters using ISO strings directly (Prisma accepts ISO format strings)
  if (props.body.created_at_gte) {
    whereInput.created_at = {
      gte: props.body.created_at_gte,
    };
  }
  if (props.body.created_at_lte) {
    whereInput.created_at = {
      lte: props.body.created_at_lte,
    };
  }
  if (props.body.updated_at_gte) {
    whereInput.updated_at = {
      gte: props.body.updated_at_gte,
    };
  }
  if (props.body.updated_at_lte) {
    whereInput.updated_at = {
      lte: props.body.updated_at_lte,
    };
  }
  // Apply seller_id filter
  if (props.body.seller_id) {
    whereInput.seller_id = props.body.seller_id;
  }
  // Apply reviewer_id filter
  if (props.body.reviewer_id) {
    whereInput.reviewer_id = props.body.reviewer_id;
  }
  // Apply search filter on related seller email or display_name
  if (props.body.search) {
    const searchTerm = props.body.search.toLowerCase();
    // First find matching seller_ids
    const matchingSellers =
      await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
        where: {
          deleted_at: null,
          AND: [
            { email: { contains: searchTerm, mode: "insensitive" } },
            {
              display_name: { contains: searchTerm, mode: "insensitive" },
            },
          ],
        },
        select: { id: true },
      });
    if (matchingSellers.length > 0) {
      whereInput.seller_id = {
        in: matchingSellers.map((s) => s.id),
      };
    } else {
      // No matching sellers, return empty result
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        data: [],
      } satisfies IPageIEcommerceMallSellerApprovalRequest.ISummary;
    }
  }
  // Build order by clause with sensible defaults using ternary (no `as` assertions)
  const orderByInput:
    | Prisma.ecommerce_mall_seller_approval_requestsOrderByWithRelationInput
    | Prisma.ecommerce_mall_seller_approval_requestsOrderByWithRelationInput[] =
    props.body.sort_by === "status"
      ? { status: props.body.order ?? "desc" }
      : props.body.sort_by === "reviewer_id"
        ? { reviewer_id: props.body.order ?? "desc" }
        : { created_at: props.body.order ?? "desc" };
  // Execute query
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallSellerApprovalRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_seller_approval_requests.count({
      where: whereInput,
    }),
  ]);
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIEcommerceMallSellerApprovalRequest.ISummary;
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
// import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
// import { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerSellerApprovals(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSellerApprovalRequest.IRequest;
// }): Promise<IPageIEcommerceMallSellerApprovalRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findMany({
//     ...EcommerceMallSellerApprovalRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------