import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
export async function test_api_product_review_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random reviewId that is a positive non-zero integer
  const reviewId: number & tags.Type<"int32"> & tags.Minimum<1> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  // Retrieve the review using the provided endpoint
  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.reviews.at(connection, {
      reviewId,
    });
  typia.assert(review);
  // Validate required properties match the IShoppingMallProductReview schema
  TestValidator.predicate(
    "review ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      review.id,
    ),
  );
  TestValidator.predicate(
    "product ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      review.product_id,
    ),
  );
  TestValidator.predicate(
    "customer ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      review.customer_id,
    ),
  );
  TestValidator.predicate(
    "rating is between 1 and 5",
    review.rating >= 1 && review.rating <= 5,
  );
  TestValidator.predicate(
    "review title has content",
    review.title.length > 0 && review.title.length <= 255,
  );
  TestValidator.predicate(
    "review content has content",
    review.content.length > 0 && review.content.length <= 10000,
  );
  TestValidator.equals("review status is approved", review.status, "approved");
  TestValidator.predicate(
    "is verified status is boolean",
    typeof review.is_verified === "boolean",
  );
  TestValidator.predicate(
    "created_at is ISO date-time format",
    new Date(review.created_at).toISOString() === review.created_at,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time format",
    new Date(review.updated_at).toISOString() === review.updated_at,
  );
  TestValidator.predicate("votecount is non-negative", review.votecount >= 0);
  TestValidator.predicate(
    "commentcount is non-negative",
    review.commentcount >= 0,
  );
  // Validate images array
  if (review.images.length > 0) {
    for (const image of review.images) {
      TestValidator.predicate(
        "image URL is valid URI",
        /^https?:\/\/.+/.test(image.url),
      );
      TestValidator.predicate(
        "image name has content",
        image.name.length > 0 && image.name.length <= 255,
      );
      TestValidator.predicate(
        "image extension is valid",
        ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"].includes(
          image.extension,
        ),
      );
      TestValidator.predicate("image order is positive", image.order >= 1);
      TestValidator.predicate(
        "image review_id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          image.review_id,
        ),
      );
    }
  }
  // Validate reply summary
  if (review.reply !== null) {
    TestValidator.predicate(
      "reply ID is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        review.reply.id,
      ),
    );
    TestValidator.predicate(
      "reply review_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        review.reply.review_id,
      ),
    );
    TestValidator.predicate(
      "reply content has content",
      review.reply.content.length > 0 && review.reply.content.length <= 5000,
    );
    TestValidator.predicate(
      "reply created_at is ISO date-time format",
      new Date(review.reply.created_at).toISOString() ===
        review.reply.created_at,
    );
    TestValidator.predicate(
      "reply updated_at is ISO date-time format",
      new Date(review.reply.updated_at).toISOString() ===
        review.reply.updated_at,
    );
    TestValidator.predicate(
      "reply seller_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        review.reply.seller_id,
      ),
    );
  }
  // Validate flags is undefined (as per schema, it's optional and undefined when not present)
  TestValidator.equals("flags is undefined", review.flags, undefined);
}