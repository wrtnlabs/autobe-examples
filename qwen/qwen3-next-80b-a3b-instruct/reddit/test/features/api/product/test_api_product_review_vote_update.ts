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
export async function test_api_product_review_vote_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category as admin using generation function
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          // Added required parent_id property
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 3: Create member connection and authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/user-join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Create product as member using generation function
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 3 }),
          category_id: typia.assert(category as unknown as { id: string }).id, // Fix by asserting type and accessing id
          prices: [
            {
              // Fixed: The product_code will be set to the product.code property AFTER product is created
              // We'll construct this after product creation
              product_code: "",
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              quantity_min: 0,
            },
          ] satisfies ICommunityPlatformProduct.ICreate["prices"],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Now that product is created, we can use product.id (not code)
  // Step 5: Create review on product as member using generation function
  const review =
    await generate_random_community_platform_member_products_reviews_create(
      memberConnection,
      {
        params: { productCode: product.id },
        body: {
          productId: product.id,
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformProductReview.ICreate,
      },
    );
  typia.assert(review);
  // Step 6: Create vote on review as member (first vote)
  const firstVote =
    await api.functional.communityPlatform.products.reviews.votes.update(
      memberConnection,
      {
        productCode: product.id,
        reviewId: review.id,
        body: {
          vote_type: "up",
        } satisfies ICommunityPlatformProductReviewVote.IRequest,
      },
    );
  typia.assert(firstVote);
  // Step 7: Update vote on review as member (change vote from "up" to "down")
  const updatedVote =
    await api.functional.communityPlatform.products.reviews.votes.update(
      memberConnection,
      {
        productCode: product.id,
        reviewId: review.id,
        body: {
          vote_type: "down",
        } satisfies ICommunityPlatformProductReviewVote.IRequest,
      },
    );
  typia.assert(updatedVote);
  // Step 8: Validate that the vote was successfully updated
  TestValidator.equals(
    "vote type should be updated from up to down",
    updatedVote.vote_type,
    "down",
  );
}