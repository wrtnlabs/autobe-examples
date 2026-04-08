import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCustomersMeReviewsEligible(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallReview.IEligible[]> {
  const eligibleItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        status: "delivered",
        order: {
          ecommerce_mall_customer_id: props.customer.id,
          deleted_at: null,
        },
        reviews: {
          none: {
            ecommerce_mall_customer_id: props.customer.id,
            deleted_at: null,
          },
        },
      },
      include: {
        order: {
          select: {
            order_number: true,
          },
        },
        productSnapshot: {
          select: {
            name: true,
            productSnapshotImages: {
              select: {
                url: true,
              },
              orderBy: {
                display_order: "asc",
              },
              take: 1,
            },
          },
        },
        sellerProfileSnapshot: {
          select: {
            shop_name: true,
          },
        },
      },
      orderBy: {
        updated_at: "desc",
      },
    });
  return eligibleItems.map(
    (item): IEcommerceMallReview.IEligible => ({
      orderItemId: item.id as string & tags.Format<"uuid">,
      orderNumber: item.order.order_number,
      productId: item.ecommerce_mall_product_id as string & tags.Format<"uuid">,
      productName: item.productSnapshot.name,
      productImageUrl: item.productSnapshot.productSnapshotImages[0]?.url ?? "",
      variantId: item.ecommerce_mall_product_variant_id as string &
        tags.Format<"uuid">,
      quantity: item.quantity as number & tags.Type<"int32">,
      unitPrice: item.unit_price,
      sellerName: item.sellerProfileSnapshot.shop_name,
      deliveredAt: item.updated_at.toISOString() as string &
        tags.Format<"date-time">,
    }),
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
// import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCustomersMeReviewsEligible(props: {
//   customer: CustomerPayload;
// }): Promise<IEcommerceMallReview.IEligible> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------