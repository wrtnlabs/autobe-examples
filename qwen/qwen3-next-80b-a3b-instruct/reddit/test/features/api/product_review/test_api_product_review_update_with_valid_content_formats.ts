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
export async function test_api_product_review_update_with_valid_content_formats(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com/login/referrer", // Added required referrer property
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 2: Create product category as admin
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and gadgets",
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 3: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: "password123",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 4: Create product as member
  const productCode = "prod-" + RandomGenerator.alphaNumeric(8);
  // Generate a UUID for category_id since it's required but doesn't exist in category object
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: "Wireless Headphones",
          description:
            "High-quality wireless headphones with noise cancellation.",
          category_id: categoryId, // Use a generated UUID instead of category.id
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: 99.99,
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 5: Create product review as member
  const review =
    await generate_random_community_platform_member_products_reviews_create(
      memberConnection,
      {
        body: {
          productId: product.productCode,
          rating: 5,
          title: "Excellent sound quality",
          content:
            "Great headphones with amazing sound quality. Highly recommended!",
        } satisfies ICommunityPlatformProductReview.ICreate,
        params: {
          productCode: product.productCode,
        },
      },
    );
  // Step 6: Update product review with formatted content
  // Total content length should be 10,000 characters
  // Current content from review creation: 59 characters
  // Need 10,000 - 59 = 9,941 additional characters
  const additionalChars = 9941;
  const formattedContent = `
  This is a **richly formatted** review with *markdown* and emojis. 

  • First bullet point with emoji ⭐
  • Second bullet point with emoji 🎧
  • Third bullet point with emoji 🔇

  ${"a".repeat(additionalChars)}`;
  // Use update function for updating existing review
  const updatedReview =
    await api.functional.communityPlatform.member.products.reviews.update(
      memberConnection,
      {
        productCode: product.productCode,
        reviewId: review.id,
        body: {
          content: formattedContent,
        } satisfies ICommunityPlatformProductReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // Validate that formatting is preserved
  TestValidator.equals(
    "review content contains bold",
    updatedReview.content.includes("**richly formatted**"),
    true,
  );
  TestValidator.equals(
    "review content contains bullet points",
    updatedReview.content.includes("•"),
    true,
  );
  TestValidator.equals(
    "review content contains emojis",
    updatedReview.content.includes("⭐"),
    true,
  );
  TestValidator.equals(
    "review content length is 10000 characters",
    updatedReview.content.length,
    10000,
  );
}
