import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberRefundRequests(props: {
  member: MemberPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  const orderField = props.body.sort_field ?? "created_at";
  const sortOrder: "asc" | "desc" = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_refund_requestsOrderByWithRelationInput[] =
    [
      {
        [orderField]: sortOrder,
      },
    ];
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    deleted_at: null,
    item: {
      order: {
        member: {
          id: props.member.id,
        },
      },
    },
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.updated_at_from && {
      updated_at: {
        gte: new Date(props.body.updated_at_from),
      },
    }),
    ...(props.body.updated_at_to && {
      updated_at: {
        lte: new Date(props.body.updated_at_to),
      },
    }),
    ...(props.body.reason_search !== undefined &&
      props.body.reason_search !== "" && {
        reason: {
          contains: props.body.reason_search,
          mode: "insensitive",
        },
      }),
  };
  let data: any;
  let total: number;
  if (props.body.cursor !== undefined) {
    const cursorId: string & tags.Format<"uuid"> = props.body.cursor;
    const cursorWhere: Prisma.ecommerce_mall_refund_requestsWhereInput = {};
    if (sortOrder === "desc") {
      cursorWhere.id = { lt: cursorId };
    } else {
      cursorWhere.id = { gt: cursorId };
    }
    data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: {
        ...whereInput,
        ...cursorWhere,
      },
      orderBy: orderByInput,
      take: limit + 1,
      ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
    });
    const hasMore = data.length > limit;
    if (hasMore) {
      data = data.slice(0, limit);
    }
    total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: whereInput,
    });
  } else {
    data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: whereInput,
    });
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallRefundRequestAtSummaryTransformer.transform,
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
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberRefundRequests(props: {
//   member: MemberPayload;
//   body: IEcommerceMallRefundRequest.IRequest;
// }): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
//     ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallRefundRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------