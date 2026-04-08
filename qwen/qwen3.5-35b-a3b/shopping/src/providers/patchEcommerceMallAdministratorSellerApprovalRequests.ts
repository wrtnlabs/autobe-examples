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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallSellerApprovalRequestAtSummaryTransformer } from "../transformers/EcommerceMallSellerApprovalRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorSellerApprovalRequests(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallSellerApprovalRequest.IRequest;
}): Promise<IPageIEcommerceMallSellerApprovalRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_seller_approval_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status && {
      status: {
        in: props.body.status,
      },
    }),
    ...(props.body.seller_id && {
      seller_id: props.body.seller_id,
    }),
    ...(props.body.reviewer_id && {
      reviewer_id: props.body.reviewer_id,
    }),
    ...(props.body.created_at_gte && {
      created_at: {
        gte: new Date(props.body.created_at_gte),
      },
    }),
    ...(props.body.created_at_lte && {
      created_at: {
        lte: new Date(props.body.created_at_lte),
      },
    }),
    ...(props.body.updated_at_gte && {
      updated_at: {
        gte: new Date(props.body.updated_at_gte),
      },
    }),
    ...(props.body.updated_at_lte && {
      updated_at: {
        lte: new Date(props.body.updated_at_lte),
      },
    }),
    ...(props.body.search && {
      OR: [
        {
          seller: {
            email: {
              contains: props.body.search,
            },
          },
        },
        {
          seller: {
            display_name: {
              contains: props.body.search,
            },
          },
        },
        {
          request_reason: {
            contains: props.body.search,
          },
        },
      ],
    }),
  } satisfies Prisma.ecommerce_mall_seller_approval_requestsWhereInput;
  const orderValue = (props.body.order ?? "desc") satisfies Prisma.SortOrder;
  const orderByInput =
    props.body.sort_by === "status"
      ? [{ status: orderValue }]
      : props.body.sort_by === "updated_at"
        ? [{ updated_at: orderValue }]
        : props.body.sort_by === "reviewer_id"
          ? [{ reviewer_id: orderValue }]
          : [{ created_at: orderValue }];
  const records =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        ...EcommerceMallSellerApprovalRequestAtSummaryTransformer.select(),
        seller: true,
        snapshotHistories: true,
        snapshot: true,
        reviewer: true,
        id: true,
        created_at: true,
        updated_at: true,
        status: true,
        deleted_at: true,
        rejection_reason: true,
        request_reason: true,
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.count({
      where: whereInput,
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
      EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform,
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
// import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
// import { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorSellerApprovalRequests(props: {
//   administrator: AdministratorPayload;
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