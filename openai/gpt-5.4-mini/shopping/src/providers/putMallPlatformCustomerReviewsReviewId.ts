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

export async function putMallPlatformCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IMallPlatformReview.IUpdate;
}): Promise<IMallPlatformReview> {
  const review = await MyGlobal.prisma.mall_platform_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      customer_id: true,
      rating: true,
      content: true,
      deleted_at: true,
    },
  });
  if (review === null || review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_review_snapshots.create({
      data: {
        id: v4(),
        snapshot_action: "update",
        is_deleted: false,
        created_at: new Date(),
        customer: { connect: { id: props.customer.id } },
        review: { connect: { id: review.id } },
        rating: review.rating,
        content: review.content,
      },
    });
    await prisma.mall_platform_reviews.update({
      where: { id: props.reviewId },
      data: {
        rating: props.body.rating,
        ...(props.body.content !== undefined
          ? { content: props.body.content }
          : {}),
      },
    });
  });
  const updated = await MyGlobal.prisma.mall_platform_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
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
    },
  );
  return {
    reviewId: updated.id,
    customer: {
      id: updated.customer.id,
      email: updated.customer.email,
      status: updated.customer.status,
      created_at: toISOStringSafe(updated.customer.created_at),
      updated_at: toISOStringSafe(updated.customer.updated_at),
      deleted_at:
        updated.customer.deleted_at === null
          ? null
          : toISOStringSafe(updated.customer.deleted_at),
    },
    displayState:
      updated.customer.deleted_at === null ? "activeCustomer" : "deletedUser",
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
// export async function putMallPlatformCustomerReviewsReviewId(props: {
//   customer: CustomerPayload;
//   reviewId: string & tags.Format<"uuid">;
//   body: IMallPlatformReview.IUpdate;
// }): Promise<IMallPlatformReview> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------