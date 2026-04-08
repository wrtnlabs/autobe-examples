import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerProductsProductIdReviewSummary(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductReview> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: {
      id: props.productId,
    },
    select: {
      id: true,
    },
  });
  const aggregate = await MyGlobal.prisma.mall_platform_reviews.aggregate({
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    _avg: {
      rating: true,
    },
    _count: {
      _all: true,
    },
  });
  return {
    averageRating: aggregate._avg.rating ?? 0,
    reviewCount: aggregate._count._all,
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
// import { IMallPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductReview";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformSellerProductsProductIdReviewSummary(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformProductReview> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------