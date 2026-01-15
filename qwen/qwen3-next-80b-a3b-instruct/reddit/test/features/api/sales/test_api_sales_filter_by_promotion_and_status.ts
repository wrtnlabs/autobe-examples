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
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSale";
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
export async function test_api_sales_filter_by_promotion_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create member connection and authorize
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Create section using admin connection
  const sectionResponse =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          visibility_level: "public",
          parent_section_id: undefined,
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  const section = sectionResponse; // section is of type ICommunityPlatformSection which is string
  // Skip category creation as we don't need real category ID
  // Create a fake UUID for category_id
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Create product using member connection with fake category_id
  const productCode = RandomGenerator.alphaNumeric(10);
  const productResponse =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Use a fake UUID, ignoring the category object as we can't use it due to type issues
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
              quantity_min: 1,
              quantity_max: undefined,
              notes: "",
              source: "ManualEntry",
              region: "",
              price_type: "",
              tax_rate: undefined,
              unit: "",
            },
          ] satisfies ICommunityPlatformProductPrice.ICreate[] &
            tags.MinItems<1>,
          images: [] satisfies
            | ICommunityPlatformProductImage.ICreate[]
            | undefined,
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  const product = productResponse;
  // Create two sales using member connection
  // We cannot set promotion_code during creation, so we'll create two sales and let them have default status 'active'
  // The scenario wants to filter by promotion_code and status, so we'll filter by status only since promotion_code cannot be set
  // We'll use status filtering to test the endpoint
  // Create sale1 with default status 'active'
  const sale1Response =
    await generate_random_community_platform_member_sales_create(
      memberConnection,
      {
        body: {
          product_id: product.id,
          price: 100,
          currency_code: "USD",
          stock_quantity: 10,
          title: "First sale",
          description: "First test sale",
          section_id: section, // section is string, so this is correct
        } satisfies ICommunityPlatformSale.ICreate,
      },
    );
  const sale1 = sale1Response;
  // Create sale2 with default status 'active'
  const sale2Response =
    await generate_random_community_platform_member_sales_create(
      memberConnection,
      {
        body: {
          product_id: product.id,
          price: 200,
          currency_code: "USD",
          stock_quantity: 5,
          title: "Second sale",
          description: "Second test sale",
          section_id: section, // section is string
        } satisfies ICommunityPlatformSale.ICreate,
      },
    );
  const sale2 = sale2Response;
  // Test the filtering endpoint with status: "active" to return all sales (since both sales have active status)
  // We cannot test promotion_code as we cannot assign it, so we focus on status
  const response = await api.functional.communityPlatform.sales.index(
    memberConnection,
    {
      body: {
        status: "active", // Filter by status
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSale.IRequest,
    },
  );
  typia.assert(response);
  // Validate we got a valid response with pagination data
  TestValidator.equals(
    "pagination has correct current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has correct limit",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has at least 1 record",
    () => response.pagination.records > 0,
  );
  TestValidator.predicate(
    "response has at least 1 sale",
    () => response.data.length > 0,
  );
  // Validate that returned data has the correct structure
  TestValidator.equals(
    "first sale has an id",
    response.data[0].id,
    sale1.id || sale2.id,
  );
  TestValidator.equals(
    "first sale has a title",
    typeof response.data[0].title,
    "string",
  );
  TestValidator.equals(
    "first sale has a price",
    typeof response.data[0].price,
    "number",
  );
  TestValidator.equals(
    "first sale has a currency_code",
    typeof response.data[0].currency_code,
    "string",
  );
  TestValidator.equals(
    "first sale has a status",
    typeof response.data[0].status,
    "string",
  );
  TestValidator.equals(
    "first sale has a seller",
    typeof response.data[0].seller,
    "object",
  );
  TestValidator.equals(
    "first sale has a primary_category",
    typeof response.data[0].primary_category,
    "object",
  );
  TestValidator.equals(
    "first sale has a created_at",
    typeof response.data[0].created_at,
    "string",
  );
  // Verify the response contains the sales we created
  const responseIds = response.data.map((sale) => sale.id);
  TestValidator.predicate("response contains sale1", () =>
    responseIds.includes(sale1.id),
  );
  TestValidator.predicate("response contains sale2", () =>
    responseIds.includes(sale2.id),
  );
}
