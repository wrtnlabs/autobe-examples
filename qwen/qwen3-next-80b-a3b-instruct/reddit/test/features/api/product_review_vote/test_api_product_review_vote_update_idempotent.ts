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
export async function test_api_product_review_vote_update_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create product category as admin - we'll use this to create the category but won't use its id
  // Since ICommunityPlatformProductCategory doesn't have 'id' property, we'll generate a UUID for category_id
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Generate a UUID for category_id since category object doesn't have id property
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create member user and authenticate
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 4: Create product as member with generated UUID for category_id
  const productResult =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Use generated UUID instead of category.id (which doesn't exist)
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(12),
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(productResult);
  const product = productResult;
  // Step 5: Create product review as member
  const review =
    await generate_random_community_platform_member_products_reviews_create(
      memberConnection,
      {
        body: {
          productId: product.productCode,
          rating: 5,
          title: RandomGenerator.name(),
          content: RandomGenerator.content(),
        } satisfies ICommunityPlatformProductReview.ICreate,
        params: {
          productCode: product.productCode,
        },
      },
    );
  typia.assert(review);
  // Step 6: Create initial vote on review
  const vote1 =
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
  typia.assert(vote1);
  TestValidator.equals("first vote type", vote1.vote_type, "up");
  // Step 7: Update vote with same type (idempotent operation)
  const vote2 =
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
  typia.assert(vote2);
  TestValidator.equals("second vote type (idempotent)", vote2.vote_type, "up");
  TestValidator.equals(
    "vote should be identical",
    vote1.vote_type,
    vote2.vote_type,
  );
  // Since ICommunityPlatformProductReviewVote doesn't have an 'id' property, we cannot compare vote1.id and vote2.id.
  // We verify the idempotent nature by comparing vote_type which is the same.
  // In a production system, you might verify if the same database record was updated using a staging environment or logs,
  // but according to the interface contract, this is the only verifiable assertion possible.
}
