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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerReviewsReviewIdOwnership(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformReview> {
  const review = await MyGlobal.prisma.mall_platform_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      customer_id: true,
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
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    reviewId: review.id,
    customer: {
      id: review.customer.id,
      email: review.customer.email,
      status: review.customer.status,
      created_at: review.customer.created_at.toISOString(),
      updated_at: review.customer.updated_at.toISOString(),
      deleted_at:
        review.customer.deleted_at === null
          ? null
          : review.customer.deleted_at.toISOString(),
    },
    displayState:
      review.customer.deleted_at === null && review.customer.status === "active"
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
// export async function getMallPlatformCustomerReviewsReviewIdOwnership(props: {
//   customer: CustomerPayload;
//   reviewId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformReview> {
//   return {
//     reviewId: ...,
//     customer: await MallPlatformCustomerAtSummaryTransformer.transform(...),
//     displayState: ...,
//   };
// }
// ```
//--------------------------------------------------------------