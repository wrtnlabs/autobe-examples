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
export async function test_api_product_price_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Type assertion to include the id property that exists in the actual response
  const categoryWithId = typia.assert<
    ICommunityPlatformProductCategory & {
      id: string;
    }
  >(category);
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Generate product code as UUID
  const generatedProductCode = typia.random<string & tags.Format<"uuid">>();
  // Create product with one required price
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: generatedProductCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          // Use the correct UUID id from category
          category_id: categoryWithId.id,
          prices: [
            {
              product_code: generatedProductCode,
              currency_code: "USD",
              amount: 199.99,
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Store first price data exactly
  const firstPriceData: ICommunityPlatformProductPrice.ICreate = {
    product_code: generatedProductCode,
    currency_code: "USD",
    amount: 199.99,
    effective_from: new Date().toISOString(),
  };
  // Create second price record with different effective_from
  const secondPriceData: ICommunityPlatformProductPrice.ICreate = {
    product_code: generatedProductCode,
    currency_code: "USD",
    amount: 299.99,
    effective_from: new Date(Date.now() + 86400000).toISOString(),
  };
  const secondPrice =
    await generate_random_community_platform_member_products_prices_create(
      memberConnection,
      {
        params: { productCode: generatedProductCode },
        body: secondPriceData,
      },
    );
  typia.assert(secondPrice);
  // Validate second price
  TestValidator.equals(
    "second price currency matches",
    secondPrice.currency,
    "USD",
  );
  TestValidator.equals(
    "second price amount matches",
    secondPrice.amount,
    299.99,
  );
  // Verify duplicate pricing fails
  await TestValidator.error(
    "duplicate pricing within same date range and currency should fail",
    async () => {
      await generate_random_community_platform_member_products_prices_create(
        memberConnection,
        {
          params: { productCode: generatedProductCode },
          body: firstPriceData,
        },
      );
    },
  );
}
