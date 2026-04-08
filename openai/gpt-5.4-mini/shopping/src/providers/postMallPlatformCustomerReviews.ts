import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformReviewCollector } from "../collectors/MallPlatformReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerReviews(props: {
  customer: CustomerPayload;
  body: IMallPlatformReview.ICreate;
}): Promise<IMallPlatformReview> {
  const deliveredOrderItem =
    await MyGlobal.prisma.mall_platform_order_items.findFirstOrThrow({
      where: {
        mall_platform_order_id: props.customer.id,
        status: "delivered",
      },
      select: {
        id: true,
        mall_platform_product_variant_id: true,
      },
    });
  const existingReview = await MyGlobal.prisma.mall_platform_reviews.findFirst({
    where: {
      order_item_id: deliveredOrderItem.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existingReview !== null) {
    throw new HttpException("Review already exists for this purchase", 409);
  }
  const createdReview = await MyGlobal.prisma.mall_platform_reviews.create({
    data: await MallPlatformReviewCollector.collect({
      body: props.body,
      customer: {
        id: props.customer.id,
      },
      orderItem: {
        id: deliveredOrderItem.id,
      },
      product: {
        id: deliveredOrderItem.mall_platform_product_variant_id,
      },
    }),
    select: {
      id: true,
      customer: {
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  return {
    reviewId: createdReview.id,
    customer: {
      id: createdReview.customer.id,
      email: createdReview.customer.email,
      status: createdReview.customer.status,
      created_at: toISOStringSafe(createdReview.customer.created_at),
      updated_at: toISOStringSafe(createdReview.customer.updated_at),
      deleted_at:
        createdReview.customer.deleted_at === null
          ? null
          : toISOStringSafe(createdReview.customer.deleted_at),
    },
    displayState:
      createdReview.customer.deleted_at === null &&
      createdReview.customer.status !== "deleted"
        ? "activeCustomer"
        : "deletedUser",
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
// import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformCustomerReviews(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformReview.ICreate;
// }): Promise<IMallPlatformReview> {
//   await MyGlobal.prisma.mall_platform_reviews.create({
//     data: await MallPlatformReviewCollector.collect({
//       body: props.body,
//       ...
//     }),
//   });
// }
// ```
//--------------------------------------------------------------