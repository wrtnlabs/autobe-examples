import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallAdministratorProductsProductIdRatings(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallProduct.IRating> {
  // Verify product exists — throws 404 if not found
  await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  // Aggregate ratings in a single query
  const aggregation = await MyGlobal.prisma.e_commerce_mall_reviews.aggregate({
    where: {
      e_commerce_mall_product_id: props.productId,
      deleted_at: null,
    },
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });
  // Round average to one decimal place; default to 0 when no reviews exist
  const averageRating =
    aggregation._avg.rating !== null
      ? Math.round(aggregation._avg.rating * 10) / 10
      : 0;
  return {
    averageRating,
    totalCount: aggregation._count.id,
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
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallAdministratorProductsProductIdRatings(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallProduct.IRating> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------