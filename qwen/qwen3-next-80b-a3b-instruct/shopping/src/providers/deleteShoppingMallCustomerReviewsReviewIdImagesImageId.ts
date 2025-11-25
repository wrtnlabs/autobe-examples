import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerReviewsReviewIdImagesImageId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: {
      id: props.reviewId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!review) {
    throw new HttpException("Review not found or inaccessible", 404);
  }

  const image = await MyGlobal.prisma.shopping_mall_review_images.findUnique({
    where: {
      id: props.imageId,
      shopping_mall_review_id: props.reviewId,
    },
  });

  if (!image) {
    throw new HttpException("Image not found or unrelated to review", 404);
  }

  await MyGlobal.prisma.shopping_mall_review_images.delete({
    where: {
      id: props.imageId,
    },
  });

  try {
    await MyGlobal.prisma.shopping_mall_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "customer",
        actor_id: props.customer.id,
        event_type: "DELETE_REVIEW_IMAGE",
        event_details: `Customer ${props.customer.id} deleted review image ${props.imageId} from review ${props.reviewId}`,
        status: "success",
        source: "web",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } catch {
    // Audit log failure is non-critical - operation already succeeded
  }
}
