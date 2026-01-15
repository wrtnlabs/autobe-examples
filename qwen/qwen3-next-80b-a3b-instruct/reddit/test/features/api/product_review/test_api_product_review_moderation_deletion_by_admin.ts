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
// Extended interface to add id property which is likely returned by the system but not defined in the provided DTO
interface ICommunityPlatformProductCategoryWithId extends ICommunityPlatformProductCategory {
  id: string;
}
export async function test_api_product_review_moderation_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Admin creates a product category using the correct schema properties
  const category =
    (await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics", // Use a fixed, meaningful name for top-level category
          description: "Top-level category for electronic products",
          // Use correct property name 'parent_id' as defined in schema
          // Set to null for top-level category
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    )) as ICommunityPlatformProductCategoryWithId;
  typia.assert(category);
  // Step 3: Create member connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Member creates a product using category_id (the UUID from category)
  const productCode = RandomGenerator.alphaNumeric(12);
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          // Use correct property name 'category_id' with the actual UUID from category object
          category_id: category.id,
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Member creates a review on the product
  const review =
    await generate_random_community_platform_member_products_reviews_create(
      memberConnection,
      {
        body: {
          productId: product.productCode,
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content(),
        } satisfies ICommunityPlatformProductReview.ICreate,
        params: {
          productCode: product.productCode,
        },
      },
    );
  typia.assert(review);
  // Step 6: Admin deletes the review
  await api.functional.communityPlatform.admin.products.reviews.erase(
    adminConnection,
    {
      productCode: product.productCode,
      reviewId: review.id,
    },
  );
  // Final verification: Try to delete the review again - it should fail (404)
  await TestValidator.error(
    "deleting already deleted review should fail",
    async () => {
      await api.functional.communityPlatform.admin.products.reviews.erase(
        adminConnection,
        {
          productCode: product.productCode,
          reviewId: review.id,
        },
      );
    },
  );
}
