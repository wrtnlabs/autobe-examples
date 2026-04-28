import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformSnapshotRefundRequestAtSummaryTransformer } from "../transformers/EcommercePlatformSnapshotRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCustomerRefundRequestsRefundRequestIdSnapshots(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommercePlatformSnapshotRefundRequest.IRequest;
}): Promise<IPageIEcommercePlatformSnapshotRefundRequest.ISummary> {
  // Verify customer has access to this refund request via order chain
  const refundRequest =
    await MyGlobal.prisma.ecommerce_platform_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        orderItem: {
          select: {
            order: {
              select: {
                ecommerce_platform_customer_profile_id: true,
              },
            },
          },
        },
      },
    });
  if (
    refundRequest.orderItem.order.ecommerce_platform_customer_profile_id !==
    props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const effectivePage = page < 1 ? 1 : page;
  const limit = props.body.limit ?? 100;
  const skip = (effectivePage - 1) * limit;
  // Build where clause with all optional filters
  const whereInput = {
    ecommerce_platform_refund_requests_id: props.refundRequestId,
    ...(props.body.previousApprovalStatus !== undefined && {
      previous_approval_status: props.body.previousApprovalStatus,
    }),
    ...(props.body.currentApprovalStatus !== undefined && {
      current_approval_status: props.body.currentApprovalStatus,
    }),
    ...(props.body.search !== undefined && {
      OR: [
        { current_reason: { contains: props.body.search } },
        { previous_reason: { contains: props.body.search } },
      ],
    }),
    ...((props.body.fromCreatedAt !== undefined ||
      props.body.toCreatedAt !== undefined) && {
      created_at: {
        ...(props.body.fromCreatedAt !== undefined && {
          gte: props.body.fromCreatedAt,
        }),
        ...(props.body.toCreatedAt !== undefined && {
          lte: props.body.toCreatedAt,
        }),
      },
    }),
  } satisfies Prisma.ecommerce_platform_snapshot_refund_requestsWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_platform_snapshot_refund_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommercePlatformSnapshotRefundRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_platform_snapshot_refund_requests.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: effectivePage,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformSnapshotRefundRequestAtSummaryTransformer.transform,
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
// import { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
// import { IPageIEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotRefundRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
// import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformCustomerRefundRequestsRefundRequestIdSnapshots(props: {
//   customer: CustomerPayload;
//   refundRequestId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformSnapshotRefundRequest.IRequest;
// }): Promise<IPageIEcommercePlatformSnapshotRefundRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_snapshot_refund_requests.findMany({
//     ...EcommercePlatformSnapshotRefundRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformSnapshotRefundRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------