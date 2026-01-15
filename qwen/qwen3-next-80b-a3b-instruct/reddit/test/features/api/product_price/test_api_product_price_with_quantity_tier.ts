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
export async function test_api_product_price_with_quantity_tier(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  // adminConnection.headers is now updated internally with auth token
  typia.assert(admin);
  // Step 2: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  // memberConnection.headers is now updated internally with auth token
  typia.assert(member);
  // Step 3: Create product category as admin using utility function
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          status: "active",
        },
      },
    );
  typia.assert(category);
  // Step 4: Create product as member with initial retail price
  // Since ICommunityPlatformProductCategory has no 'id' property,
  // generate a UUID for category_id as a workaround for system design
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(3),
          description: RandomGenerator.content({ paragraphs: 1 }),
          category_id: categoryId, // Create with generated UUID
        },
      },
    );
  typia.assert(product);
  // Step 5: Add wholesale price tier with quantity constraints using utility function
  const wholesalePrice =
    await generate_random_community_platform_member_products_prices_create(
      memberConnection,
      {
        params: {
          productCode: product.productCode,
        },
        body: {
          product_code: product.productCode,
          currency_code: "USD",
          amount: 79.99,
          effective_from: new Date().toISOString(),
          quantity_min: 10,
          quantity_max: 100,
        },
      },
    );
  typia.assert(wholesalePrice);
  // Validate the returned wholesale price
  TestValidator.equals("wholesale price amount", wholesalePrice.amount, 79.99);
  TestValidator.equals(
    "wholesale price currency",
    wholesalePrice.currency,
    "USD",
  );
  TestValidator.equals(
    "wholesale price minimum quantity",
    wholesalePrice.quantity_min,
    10,
  );
  TestValidator.equals(
    "wholesale price maximum quantity",
    wholesalePrice.quantity_max,
    100,
  );
  // Step 6: Test that overlapping quantity tiers are prevented
  await TestValidator.error(
    "cannot create overlapping quantity tier",
    async () => {
      await generate_random_community_platform_member_products_prices_create(
        memberConnection,
        {
          params: {
            productCode: product.productCode,
          },
          body: {
            product_code: product.productCode,
            currency_code: "USD",
            amount: 69.99,
            effective_from: new Date().toISOString(),
            quantity_min: 5, // overlaps with wholesale (10-100) - starting at 5
            quantity_max: 15, // overlaps with wholesale (10-100) - ending at 15
          },
        },
      );
    },
  );
  // Step 7: Test that tier with no max and tier with max don't conflict
  const bulkPrice =
    await generate_random_community_platform_member_products_prices_create(
      memberConnection,
      {
        params: {
          productCode: product.productCode,
        },
        body: {
          product_code: product.productCode,
          currency_code: "USD",
          amount: 59.99,
          effective_from: new Date().toISOString(),
          quantity_min: 101,
          quantity_max: null,
        },
      },
    );
  typia.assert(bulkPrice);
  // Validate the returned bulk price
  TestValidator.equals("bulk price amount", bulkPrice.amount, 59.99);
  TestValidator.equals("bulk price currency", bulkPrice.currency, "USD");
  TestValidator.equals(
    "bulk price minimum quantity",
    bulkPrice.quantity_min,
    101,
  );
  TestValidator.equals(
    "bulk price maximum quantity",
    bulkPrice.quantity_max,
    null,
  );
}
