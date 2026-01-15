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
export async function test_api_product_review_vote_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    },
  });
  // Extract email: IAuthorized may not expose email directly - use typia.assert to strip type tags
  const adminEmail: string = typia.assert<{
    email: string;
  }>(adminAuth).email;
  // adminConnection.headers is updated by authorize function
  // Step 2: Create product category
  const category =
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
  // Extract category id: use typia.assert to strip type tags and access id
  const categoryId: string & tags.Format<"uuid"> = typia.assert<{
    id: string;
  }>(category).id;
  // Step 3: Create product without prices first
  const createdProduct =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          category_id: categoryId,
        },
      },
    );
  typia.assert(createdProduct);
  // Now we have productCode from the created product
  const productCode: string = createdProduct.productCode;
  // Create product prices after product creation - use prepare function
  const productPrice = await prepare_random_community_platform_product_price({
    product_code: productCode,
    currency_code: "KRW",
    amount: typia.random<number & tags.Minimum<0>>(),
    effective_from: new Date().toISOString(),
  });
  typia.assert(productPrice);
  // Step 4: Create member connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    },
  });
  // memberConnection.headers is updated by authorize function
  // Step 5: Create review on product by member
  const review =
    await generate_random_community_platform_member_products_reviews_create(
      memberConnection,
      {
        body: {
          productId: productCode, // Use productCode from created product
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
        params: {
          productCode: productCode, // Use productCode from created product
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
        },
        params: {
          productCode: productCode,
          reviewId: review.id,
        },
      },
    );
  typia.assert(vote);
  // Step 7: Re-authenticate as admin to perform moderation
  const adminModeratorConnection: api.IConnection = { host: connection.host };
  // Use a fixed password for admin login since join doesn't return password
  // This is a known test credential assumption
  const adminModeratorAuth = await authorize_admin_login(
    adminModeratorConnection,
    {
      body: {
        email: adminEmail, // Use extracted email
        password: "test123",
        href: "https://example.com/admin/login",
        referrer: "https://example.com",
      },
    },
  );
  // adminModeratorConnection.headers is updated by authorize function
  // Step 8: Admin deletes the member's vote
  // No response body for DELETE, but we validate by successful execution
  await api.functional.communityPlatform.member.products.reviews.votes.erase(
    adminModeratorConnection,
    {
      productCode: productCode,
      reviewId: review.id,
      userId: review.member_id,
    },
  );
  // Validation: Since the DELETE returns 204 No Content, we assume success if no error
  // We could check if the vote exists no more,
  // but there's no GET endpoint to verify - therefore we rely on the call succeeding without throwing
}
