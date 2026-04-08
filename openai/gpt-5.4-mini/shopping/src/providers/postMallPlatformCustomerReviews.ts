import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformReviewCollector } from "../collectors/MallPlatformReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformReviewTransformer } from "../transformers/MallPlatformReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerReviews(props: {
  customer: CustomerPayload;
  body: IMallPlatformReview.ICreate;
}): Promise<IMallPlatformReview> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const orderItem = await prisma.mall_platform_order_items.findUniqueOrThrow({
      where: {
        id: props.body.orderItemId,
      },
      select: {
        id: true,
        status: true,
        mall_platform_order_id: true,
        mall_platform_product_variant_id: true,
      },
    });
    const order = await prisma.mall_platform_orders.findUniqueOrThrow({
      where: {
        id: orderItem.mall_platform_order_id,
      },
      select: {
        customer_id: true,
      },
    });
    if (order.customer_id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    const productVariant =
      await prisma.mall_platform_product_variants.findUniqueOrThrow({
        where: {
          id: orderItem.mall_platform_product_variant_id,
        },
        select: {
          mall_platform_product_id: true,
        },
      });
    if (productVariant.mall_platform_product_id !== props.body.productId) {
      throw new HttpException("Product does not match purchase context", 400);
    }
    if (orderItem.status !== "delivered") {
      throw new HttpException("Review is allowed only after delivery", 400);
    }
    const existing = await prisma.mall_platform_reviews.findFirst({
      where: {
        order_item_id: props.body.orderItemId,
        product_id: props.body.productId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (existing !== null) {
      throw new HttpException("Review already exists for this purchase", 409);
    }
    const created = await prisma.mall_platform_reviews.create({
      data: await MallPlatformReviewCollector.collect({
        body: props.body,
        customer: props.customer,
      }),
      ...MallPlatformReviewTransformer.select(),
    });
    return await MallPlatformReviewTransformer.transform(created);
  });
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
// import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformCustomerReviews(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformReview.ICreate;
// }): Promise<IMallPlatformReview> {
//   const record = await MyGlobal.prisma.mall_platform_reviews.create({
//     data: await MallPlatformReviewCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformReviewTransformer.select(),
//   });
//   return await MallPlatformReviewTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------