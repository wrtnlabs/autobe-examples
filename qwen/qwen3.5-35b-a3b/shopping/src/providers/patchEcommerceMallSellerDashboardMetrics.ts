import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboardMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerDashboardMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerDashboardMetricAtSummaryTransformer } from "../transformers/EcommerceMallSellerDashboardMetricAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerDashboardMetrics(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerDashboardMetric.IRequest;
}): Promise<IPageIEcommerceMallSellerDashboardMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_seller_dashboard_metricsWhereInput = {
    seller_id: props.seller.id,
    deleted_at: null,
  };
  if (props.body.createdAtGte !== undefined) {
    whereInput.created_at = { gte: props.body.createdAtGte };
  }
  if (props.body.createdAtLt !== undefined) {
    whereInput.created_at = {
      ...(whereInput.created_at as Prisma.DateTimeFilter | undefined),
      lt: props.body.createdAtLt,
    };
  }
  if (props.body.updatedAtGte !== undefined) {
    whereInput.updated_at = { gte: props.body.updatedAtGte };
  }
  if (props.body.updatedAtLt !== undefined) {
    whereInput.updated_at = {
      ...(whereInput.updated_at as Prisma.DateTimeFilter | undefined),
      lt: props.body.updatedAtLt,
    };
  }
  if (props.body.productCountGte !== undefined) {
    whereInput.product_count = {
      ...(whereInput.product_count as Prisma.IntFilter | undefined),
      gte: props.body.productCountGte,
    };
  }
  if (props.body.productCountLte !== undefined) {
    whereInput.product_count = {
      ...(whereInput.product_count as Prisma.IntFilter | undefined),
      lte: props.body.productCountLte,
    };
  }
  if (props.body.orderItemCountGte !== undefined) {
    whereInput.order_item_count = {
      ...(whereInput.order_item_count as Prisma.IntFilter | undefined),
      gte: props.body.orderItemCountGte,
    };
  }
  if (props.body.orderItemCountLte !== undefined) {
    whereInput.order_item_count = {
      ...(whereInput.order_item_count as Prisma.IntFilter | undefined),
      lte: props.body.orderItemCountLte,
    };
  }
  if (props.body.pendingCancellationCountGte !== undefined) {
    whereInput.pending_cancellation_count = {
      ...(whereInput.pending_cancellation_count as
        | Prisma.IntFilter
        | undefined),
      gte: props.body.pendingCancellationCountGte,
    };
  }
  if (props.body.pendingCancellationCountLte !== undefined) {
    whereInput.pending_cancellation_count = {
      ...(whereInput.pending_cancellation_count as
        | Prisma.IntFilter
        | undefined),
      lte: props.body.pendingCancellationCountLte,
    };
  }
  if (props.body.pendingRefundCountGte !== undefined) {
    whereInput.pending_refund_count = {
      ...(whereInput.pending_refund_count as Prisma.IntFilter | undefined),
      gte: props.body.pendingRefundCountGte,
    };
  }
  if (props.body.pendingRefundCountLte !== undefined) {
    whereInput.pending_refund_count = {
      ...(whereInput.pending_refund_count as Prisma.IntFilter | undefined),
      lte: props.body.pendingRefundCountLte,
    };
  }
  const orderByInput: Prisma.ecommerce_mall_seller_dashboard_metricsOrderByWithRelationInput[] =
    props.body.sortBy
      ? [
          {
            [props.body.sortBy]:
              props.body.sortOrder === "asc"
                ? ("asc" as const)
                : ("desc" as const),
          },
        ]
      : [{ created_at: "desc" }];
  const records =
    await MyGlobal.prisma.ecommerce_mall_seller_dashboard_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallSellerDashboardMetricAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_dashboard_metrics.count({
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
      EcommerceMallSellerDashboardMetricAtSummaryTransformer.transform,
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
// import { IEcommerceMallSellerDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboardMetric";
// import { IPageIEcommerceMallSellerDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerDashboardMetric";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerDashboardMetrics(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSellerDashboardMetric.IRequest;
// }): Promise<IPageIEcommerceMallSellerDashboardMetric.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_dashboard_metrics.findMany({
//     ...EcommerceMallSellerDashboardMetricAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerDashboardMetricAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------