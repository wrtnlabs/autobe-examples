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
export async function test_api_product_review_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate member via join (login not needed as join returns token)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create admin connection and authenticate admin via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/home",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoin,
  });
  typia.assert(adminAuth);
  // Step 3: Admin creates product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 4: Member creates product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 3 }),
          category_id: typia.assert<{ id: string }>(category).id, // Assert category has an id property
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Member submits product review
  const review =
    await api.functional.communityPlatform.member.products.reviews.create(
      memberConnection,
      {
        productCode: product.productCode,
        body: {
          productId: product.productCode,
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformProductReview.ICreate,
      },
    );
  typia.assert(review);
  // Step 6: Validate review creation
  TestValidator.equals(
    "review productCode matches product",
    review.product_code,
    product.productCode,
  );
  TestValidator.equals(
    "review member_id matches authenticating member",
    review.member_id,
    memberAuth.id,
  );
  TestValidator.equals("review rating is valid", review.rating, review.rating);
  TestValidator.equals("review title is valid", review.title, review.title);
  TestValidator.equals(
    "review content is valid",
    review.content,
    review.content,
  );
  TestValidator.equals(
    "review status is published",
    review.status,
    "published",
  );
}