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
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_products_prices_create } from "../../../generate/generate_random_community_platform_member_products_prices_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_price_retrieval(
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
  // Step 2: Create a product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 3: Create member connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Create a product without prices first
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content(),
          category_id: (category as any).id,
          prices: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  
  // Step 5: Create the price records using the productCode from the created product
  const price =
    await generate_random_community_platform_member_products_prices_create(
      memberConnection,
      {
        body: {
          product_code: product.productCode,
          currency_code: "USD",
          amount: typia.random<number & tags.Minimum<0> & tags.Maximum<1000>>(),
          effective_from: new Date().toISOString(),
          quantity_min: 1,
          quantity_max: null,
        } satisfies ICommunityPlatformProductPrice.ICreate,
        params: {
          productCode: product.productCode,
        },
      },
    );

  // Step 6: Retrieve the price record using the correct connection and priceId
  const retrievedPrice =
    await api.functional.communityPlatform.member.products.prices.at(
      memberConnection,
      {
        productCode: product.productCode,
        priceId: price.id,
      },
    );
  typia.assert(retrievedPrice);
  // Validate that the retrieved price matches the created price
  TestValidator.equals(
    "retrieved price ID matches created price ID",
    retrievedPrice.id,
    price.id,
  );
  TestValidator.equals(
    "retrieved price product code matches",
    retrievedPrice.product_code,
    price.product_code,
  );
  TestValidator.equals(
    "retrieved price currency matches",
    retrievedPrice.currency,
    price.currency,
  );
  TestValidator.equals(
    "retrieved price amount matches",
    retrievedPrice.amount,
    price.amount,
  );
  TestValidator.equals(
    "retrieved price effective_from matches",
    retrievedPrice.effective_from,
    price.effective_from,
  );
  TestValidator.equals(
    "retrieved price effective_to matches",
    retrievedPrice.effective_to,
    price.effective_to,
  );
  TestValidator.equals(
    "retrieved price quantity_min matches",
    retrievedPrice.quantity_min,
    price.quantity_min,
  );
  TestValidator.equals(
    "retrieved price quantity_max matches",
    retrievedPrice.quantity_max,
    price.quantity_max,
  );
  // Step 7: Test access control - create another member
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Verify other member cannot access this price
  await TestValidator.error(
    "other member cannot access private price",
    async () => {
      await api.functional.communityPlatform.member.products.prices.at(
        otherMemberConnection,
        {
          productCode: product.productCode,
          priceId: price.id,
        },
      );
    },
  );
  // Step 8: Test non-existent price ID
  await TestValidator.error("non-existent price ID should fail", async () => {
    await api.functional.communityPlatform.member.products.prices.at(
      memberConnection,
      {
        productCode: product.productCode,
        priceId: "00000000-0000-0000-0000-000000000000",
      },
    );
  });
  // Step 9: Test non-existent product code
  await TestValidator.error(
    "non-existent product code should fail",
    async () => {
      await api.functional.communityPlatform.member.products.prices.at(
        memberConnection,
        {
          productCode: "non-existent-code-123",
          priceId: price.id,
        },
      );
    },
  );
}