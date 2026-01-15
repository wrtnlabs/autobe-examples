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
import { prepare_random_community_platform_product_review_vote } from "../../../prepare/prepare_random_community_platform_product_review_vote";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_review } from "../../../prepare/prepare_random_community_platform_product_review";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_products_reviews_create } from "../../../generate/generate_random_community_platform_member_products_reviews_create";
import { generate_random_community_platform_member_products_reviews_votes_create } from "../../../generate/generate_random_community_platform_member_products_reviews_votes_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_review_vote_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and register admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create member connection and register member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 3: Admin creates a product category
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
  // Generate product code first before creating product
  const productCode = RandomGenerator.alphaNumeric(8);
  // Generate a UUID for category_id since ICommunityPlatformProductCategory has no 'id' field
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Member creates a product with explicit price using the generated code
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          // Use a generated UUID for category_id since ICommunityPlatformProductCategory doesn't have an id
          category_id: categoryId,
          // Include required prices array with correct product_code matching generated code
          prices: [
            {
              product_code: productCode, // Use productCode variable instead of product.productCode
              currency_code: "USD",
              amount: 1000,
              effective_from: new Date().toISOString(),
              effective_to: null,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Member creates a product review
  const review =
    await generate_random_community_platform_member_products_reviews_create(
      memberConnection,
      {
        body: {
          productId: product.productCode,
          rating: 5,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content(),
        } satisfies ICommunityPlatformProductReview.ICreate,
        params: {
          productCode: product.productCode,
        },
      },
    );
  typia.assert(review);
  // Step 6: Member votes on their own review
  const vote =
    await generate_random_community_platform_member_products_reviews_votes_create(
      memberConnection,
      {
        body: {
          value: 1,
          vote_type: "up",
        } satisfies ICommunityPlatformProductReviewVote.ICreate,
        params: {
          productCode: product.productCode,
          reviewId: review.id,
        },
      },
    );
  typia.assert(vote);
  // Step 7: Member deletes their own vote (should succeed)
  await api.functional.communityPlatform.member.products.reviews.votes.erase(
    memberConnection,
    {
      productCode: product.productCode,
      reviewId: review.id,
      userId: member.id, // Use member.id from authorized member object
    },
  );
  // Step 8: Try to delete the same vote with another member (should fail with 404)
  // Create another member connection
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(anotherMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(anotherMember);
  await TestValidator.error("non-owner cannot delete vote", async () => {
    await api.functional.communityPlatform.member.products.reviews.votes.erase(
      anotherMemberConnection,
      {
        productCode: product.productCode,
        reviewId: review.id,
        userId: member.id, // Use member.id from authorized member object
      },
    );
  });
  // Step 9: Try to delete with admin (should fail with 404 - admins can't delete user votes unless authorized)
  await TestValidator.error("admin cannot delete user vote", async () => {
    await api.functional.communityPlatform.member.products.reviews.votes.erase(
      adminConnection,
      {
        productCode: product.productCode,
        reviewId: review.id,
        userId: member.id, // Use member.id from authorized member object
      },
    );
  });
}
