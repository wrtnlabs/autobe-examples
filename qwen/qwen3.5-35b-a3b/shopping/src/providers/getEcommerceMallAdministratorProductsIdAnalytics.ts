import { IEcommerceMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductAnalytic";
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

export async function getEcommerceMallAdministratorProductsIdAnalytics(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductAnalytic> {
  // Validate product exists and is not soft-deleted
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.id,
        deleted_at: null,
      },
      select: {
        id: true,
        seller_id: true,
        category_id: true,
      },
    });
  // Query all product variants
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        product_id: props.id,
        deleted_at: null,
      },
      select: {
        id: true,
        stock_quantity: true,
      },
    });
  // Calculate inventory metrics
  const total_variants: number & tags.Type<"int32"> & tags.Minimum<0> =
    variants.length;
  const in_stock_variants: number & tags.Type<"int32"> & tags.Minimum<0> =
    variants.filter((v) => v.stock_quantity > 0).length;
  const total_inventory: number & tags.Type<"int32"> & tags.Minimum<0> =
    variants.reduce(
      (sum, v) => (v.stock_quantity > 0 ? sum + v.stock_quantity : sum),
      0,
    );
  // Get all variant IDs for order items calculation
  const variant_ids = variants.map((v) => v.id);
  // Calculate sales metrics from delivered order items
  let total_sales_count: number & tags.Type<"int32"> & tags.Minimum<0> = 0;
  let total_revenue: number & tags.Minimum<0> = 0;
  if (variant_ids.length > 0) {
    const order_items =
      await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
        where: {
          ecommerce_mall_product_variant_id: {
            in: variant_ids,
          },
          status: "delivered",
          deleted_at: null,
        },
        select: {
          quantity: true,
          subtotal: true,
        },
      });
    total_sales_count = order_items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    total_revenue = order_items.reduce((sum, item) => sum + item.subtotal, 0);
  }
  // Fetch review statistics
  const review_stats =
    await MyGlobal.prisma.ecommerce_mall_product_review_stats.findFirst({
      where: {
        ecommerce_mall_product_id: props.id,
      },
      select: {
        average_rating: true,
        review_count: true,
      },
    });
  const total_reviews: number & tags.Type<"int32"> & tags.Minimum<0> =
    review_stats?.review_count ?? 0;
  const average_rating: number & tags.Minimum<0> & tags.Maximum<5> =
    review_stats?.average_rating ?? 0;
  // Calculate is_available
  const is_available = in_stock_variants > 0;
  // Build response with satisfies for type safety
  return {
    product_id: product.id,
    seller_id: product.seller_id,
    category_id: product.category_id,
    total_sales_count,
    total_revenue,
    total_inventory,
    total_variants,
    in_stock_variants,
    total_reviews,
    average_rating,
    is_available,
  } satisfies IEcommerceMallProductAnalytic;
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
// import { IEcommerceMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductAnalytic";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdministratorProductsIdAnalytics(props: {
//   administrator: AdministratorPayload;
//   id: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallProductAnalytic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------