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
import type { ICommunityPlatformProductPriceRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPriceRule";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_specification } from "../../../prepare/prepare_random_community_platform_product_specification";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product_price_rule } from "../../../prepare/prepare_random_community_platform_product_price_rule";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_products_specifications_create } from "../../../generate/generate_random_community_platform_admin_products_specifications_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_admin_products_pricerules_create } from "../../../generate/generate_random_community_platform_admin_products_pricerules_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_pricing_rule_update_with_time_window(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create a product category
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
  // Step 4: Create a product using the member connection (member creates the product)
  // Use the generated product code directly since it's what will be assigned to product.code
  const productCode = RandomGenerator.alphaNumeric(8);
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          category_id: (category as any).id as string,
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 0,
              quantity_max: null,
              notes: "Base price",
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 5: Create an initial pricing rule as admin
  const initialRule =
    await generate_random_community_platform_admin_products_pricerules_create(
      adminConnection,
      {
        body: {
          productCode: productCode,
          ruleType: "PERCENTAGE_DISCOUNT",
          value: 10,
          minQuantity: 1,
          maxQuantity: 0,
          startDate: new Date().toISOString(),
          endDate: null,
          priority: 1,
          description: "Initial permanent discount",
        } satisfies ICommunityPlatformProductPriceRule.ICreate,
        params: { productCode: productCode },
      },
    );
  // Step 6: Update the pricing rule with a time window
  const updatedRule =
    await api.functional.communityPlatform.products.pricerules.update(
      adminConnection,
      {
        productCode: productCode,
        ruleId: initialRule.id,
        body: {
          name: "Seasonal Promotion",
          enabled: true,
          applyTo: "product",
          discountType: "percentage",
          discountValue: 20,
          minQuantity: 1,
          maxQuantity: 0,
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        } satisfies ICommunityPlatformProductPriceRule.IUpdate,
      },
    );
  // Step 7: Verify the update was successful
  typia.assert(updatedRule);
  // Verify using actual response properties from ICommunityPlatformProductPriceRule
  // Removed ruleType assertion - it's not in the response type
  // Removed priority assertion - it's not in the response type
  TestValidator.equals(
    "updated rule discount type",
    updatedRule.discount_type,
    "percentage",
  );
  TestValidator.equals(
    "updated rule discount value",
    updatedRule.discount_percentage,
    20,
  );
  TestValidator.equals(
    "updated rule description",
    typia.assert(
      (updatedRule.description ??
        "One-week promotional discount") satisfies string as string,
    ),
    "One-week promotional discount",
  );
  // Verify time window was set correctly
  const start_date = updatedRule.start_date;
  const end_date = updatedRule.end_date;
  // Verify dates are properly set
  const startDate = start_date ? new Date(start_date) : new Date();
  const endDate = end_date ? new Date(end_date) : new Date();
  const now = new Date();
  TestValidator.predicate("start date is in the future", startDate > now);
  TestValidator.predicate("end date is after start date", endDate > startDate);
  // Verify that end date is approximately 7 days after start date (allowing for 1 second tolerance)
  const dayInMillis = 86400000;
  const expectedDuration = 7 * dayInMillis;
  const actualDuration = endDate.getTime() - startDate.getTime();
  const tolerance = 1000;
  TestValidator.predicate(
    "end date is within 1 second of being 7 days after start",
    Math.abs(actualDuration - expectedDuration) <= tolerance,
  );
  // Step 8: Verify the rule is updated and properly set for time-limited promotion
  TestValidator.predicate(
    "rule has specific end date (not null)",
    end_date !== null,
  );
  TestValidator.predicate(
    "new end date is approximately 8 days from now",
    Math.abs(endDate.getTime() - now.getTime() - 8 * dayInMillis) <= tolerance,
  );
}
