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
import type { ICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSale";
import type { ICommunityPlatformSaleItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleItem";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSaleItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSaleItem";
import { prepare_random_community_platform_section } from "../../../prepare/prepare_random_community_platform_section";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_sale } from "../../../prepare/prepare_random_community_platform_sale";
import { generate_random_community_platform_admin_sections_create } from "../../../generate/generate_random_community_platform_admin_sections_create";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_sales_create } from "../../../generate/generate_random_community_platform_member_sales_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sale_items_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    },
  });
  // Step 2: Create a product category
  const categoryCode =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        },
      },
    );
  // Verify category code is a string with UUID format
  typia.assertGuard<string & tags.Format<"uuid">>(categoryCode);
  // Step 3: Create a section
  const sectionCode =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_section_id: undefined,
          visibility_level: "public",
        },
      },
    );
  // Verify section code is a string with UUID format
  typia.assertGuard<string & tags.Format<"uuid">>(sectionCode);
  // Step 4: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    },
  });
  // Step 5: Create a product
  const productResult =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryCode,
          prices: [],
        },
      },
    );
  // Extract product properties from the summary
  const productCode = productResult.productCode;
  const productTitle = productResult.name;
  const productDescription = productResult.description;
  const productId = productResult.id;
  // Define prices with correct structure
  const prices = [
    {
      product_code: productCode,
      currency_code: "USD",
      amount: typia.random<number & tags.Minimum<0>>(),
      effective_from: new Date().toISOString(),
    },
  ];
  // Update product with prices
  await generate_random_community_platform_member_products_create(
    memberConnection,
    {
      body: {
        code: productCode,
        title: productTitle,
        description: productDescription,
        category_id: categoryCode,
        prices,
      },
    },
  );
  // Step 6: Create a sale
  const saleResult =
    await generate_random_community_platform_member_sales_create(
      memberConnection,
      {
        body: {
          product_id: productId,
          price: typia.random<number & tags.Minimum<0>>(),
          currency_code: "USD",
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          section_id: sectionCode,
        },
      },
    );
  const saleCode = saleResult.id;
  // Step 7: Retrieve sale items using member connection
  const saleItemsResponse =
    await api.functional.communityPlatform.sales.items.index(memberConnection, {
      saleCode,
      body: {
        page: 1,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    });
  typia.assert(saleItemsResponse);
  // Step 8: Validate that sale items are retrieved successfully
  TestValidator.equals(
    "pagination data populated",
    saleItemsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "item count matches limit",
    saleItemsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "items array has data",
    () => saleItemsResponse.data.length > 0,
  );
  // Step 9: Create an unauthenticated connection to verify authorization
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 10: Validate that non-members cannot access sale items
  await TestValidator.error(
    "non-member should not access sale items",
    async () => {
      await api.functional.communityPlatform.sales.items.index(
        guestConnection,
        {
          saleCode,
          body: {
            page: 1,
            limit: 20,
          },
        },
      );
    },
  );
}
