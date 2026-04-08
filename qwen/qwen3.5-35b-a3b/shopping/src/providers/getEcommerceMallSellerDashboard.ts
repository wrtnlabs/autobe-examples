import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboardMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerDashboardMetricTransformer } from "../transformers/EcommerceMallSellerDashboardMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallSellerDashboardMetric> {
  // Validate seller is approved
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
    where: {
      id: props.seller.id,
      deleted_at: null,
      approval_status: "approved",
    },
    select: {
      id: true,
      approval_status: true,
    },
  });
  // Try to find existing dashboard metrics
  const existingRecord =
    await MyGlobal.prisma.ecommerce_mall_seller_dashboard_metrics.findFirst({
      ...EcommerceMallSellerDashboardMetricTransformer.select(),
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  // Create metrics if doesn't exist
  if (existingRecord === null) {
    const newRecord =
      await MyGlobal.prisma.ecommerce_mall_seller_dashboard_metrics.create({
        data: {
          id: v4(),
          seller_id: props.seller.id,
          product_count: 0,
          order_item_count: 0,
          pending_cancellation_count: 0,
          pending_refund_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        ...EcommerceMallSellerDashboardMetricTransformer.select(),
      });
    return await EcommerceMallSellerDashboardMetricTransformer.transform(
      newRecord,
    );
  }
  return await EcommerceMallSellerDashboardMetricTransformer.transform(
    existingRecord,
  );
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerDashboard(props: {
//   seller: SellerPayload;
// }): Promise<IEcommerceMallSellerDashboardMetric> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_dashboard_metrics.findFirstOrThrow({
//     ...EcommerceMallSellerDashboardMetricTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerDashboardMetricTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------