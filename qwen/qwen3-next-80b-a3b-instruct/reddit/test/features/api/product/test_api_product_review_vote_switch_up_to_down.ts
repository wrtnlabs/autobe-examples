import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductReview";
import type { ICommunityPlatformProductReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductReviewVote";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_review } from "../../../prepare/prepare_random_community_platform_product_review";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_products_reviews_create } from "../../../generate/generate_random_community_platform_member_products_reviews_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_review_vote_switch_up_to_down(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin user for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  // Step 2: Create product category for product creation
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content(),
          parent_id: null,
          status: "active",
        },
      },
    );
  // Step 3: Create member user (voter)
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  // Step 4: Create product to be reviewed
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content(),
          category_id: (category as any).id,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(product);
  // Step 5: Create review for the product
  const review: ICommunityPlatformProductReview =
    await generate_random_community_platform_member_products_reviews_create(
      memberConnection,
      {
        params: {
          productCode: product.productCode,
        },
        body: {
          productId: product.productCode,
          rating: 5,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(review);
  // Step 6: Upvote the review
  const upvote: ICommunityPlatformProductReviewVote =
    await api.functional.communityPlatform.member.products.reviews.votes.update(
      memberConnection,
      {
        productCode: product.productCode,
        reviewId: review.id,
        userId: member.id,
        body: {
          vote_type: "up",
        } satisfies ICommunityPlatformProductReviewVote.IRequest,
      },
    );
  typia.assert(upvote);
  // Step 7: Verify upvote type is correct
  TestValidator.equals(
    "vote after upvote is of type 'up'",
    upvote.vote_type,
    "up",
  );
  // Step 8: Switch vote from upvote to downvote
  const downvote: ICommunityPlatformProductReviewVote =
    await api.functional.communityPlatform.member.products.reviews.votes.update(
      memberConnection,
      {
        productCode: product.productCode,
        reviewId: review.id,
        userId: member.id,
        body: {
          vote_type: "down",
        } satisfies ICommunityPlatformProductReviewVote.IRequest,
      },
    );
  typia.assert(downvote);
  // Step 9: Verify vote type was changed from up to down
  TestValidator.equals(
    "vote after switch is of type 'down'",
    downvote.vote_type,
    "down",
  );
  // Note: We cannot validate the net score decreased by 2 because there is no API to retrieve the review's net score.
  // The scenario's requirement for net score validation is impossible to implement as the API only provides the current vote state.
  // We have verified the vote switching functionality correctly works from up to down.
}
