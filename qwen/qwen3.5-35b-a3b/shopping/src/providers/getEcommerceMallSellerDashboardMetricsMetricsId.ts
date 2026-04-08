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

export async function getEcommerceMallSellerDashboardMetricsMetricsId(props: {
  seller: SellerPayload;
  metricsId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerDashboardMetric> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_dashboard_metrics.findFirstOrThrow(
      {
        ...EcommerceMallSellerDashboardMetricTransformer.select(),
        where: {
          id: props.metricsId,
          deleted_at: null,
        },
      },
    );
  if (record.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallSellerDashboardMetricTransformer.transform(record);
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
// export async function getEcommerceMallSellerDashboardMetricsMetricsId(props: {
//   seller: SellerPayload;
//   metricsId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSellerDashboardMetric> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_dashboard_metrics.findFirstOrThrow({
//     ...EcommerceMallSellerDashboardMetricTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerDashboardMetricTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------