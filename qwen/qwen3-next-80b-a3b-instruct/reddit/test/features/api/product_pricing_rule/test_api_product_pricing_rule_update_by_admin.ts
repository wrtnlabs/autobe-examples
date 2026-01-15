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
// Declare a type that extends ICommunityPlatformProductCategory to include id
interface ICommunityPlatformProductCategoryWithId extends ICommunityPlatformProductCategory {
  id: string & tags.Format<"uuid">;
}
export async function test_api_product_pricing_rule_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://admin.example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic products",
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Type assertion: The API response includes an id field even though it's not in the type definition
  const categoryWithId = category as ICommunityPlatformProductCategoryWithId;
  // Step 3: Create member connection and authenticate for product creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://member.example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Create product with category association (using productCode)
  const productCode = RandomGenerator.alphaNumeric(8);
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryWithId.id, // Use the id from our type assertion
          prices: [
            {
              product_code: productCode, // Use direct productCode variable
              currency_code: "USD",
              amount: 1000,
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 0,
              quantity_max: null,
              notes: undefined,
              source: undefined,
              region: undefined,
              price_type: undefined,
              tax_rate: undefined,
              unit: undefined,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Add product specifications
  await generate_random_community_platform_admin_products_specifications_create(
    adminConnection,
    {
      body: {
        key: "color",
        value: "Black",
      } satisfies ICommunityPlatformProductSpecification.ICreate,
      params: {
        productCode: product.productCode, // Correct camelCase property
      },
    },
  );
  // Step 6: Create pricing rule using correct camelCase property names
  const pricingRuleBeforeUpdate =
    await generate_random_community_platform_admin_products_pricerules_create(
      adminConnection,
      {
        body: {
          productCode: product.productCode, // Correct camelCase
          ruleType: "PERCENTAGE_DISCOUNT", // Correct camelCase
          value: 15, // 15% discount
          minQuantity: 5, // Correct camelCase
          maxQuantity: 100, // Correct camelCase
          startDate: new Date().toISOString(), // Correct camelCase
          endDate: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
          priority: 100,
          description: "Seasonal promotion",
        } satisfies ICommunityPlatformProductPriceRule.ICreate,
        params: {
          productCode: product.productCode, // Correct camelCase
        },
      },
    );
  typia.assert(pricingRuleBeforeUpdate);
  // Step 7: Update pricing rule with correct camelCase property names
  const updatedPricingRule =
    await api.functional.communityPlatform.products.pricerules.update(
      adminConnection,
      {
        productCode: product.productCode, // Correct camelCase
        ruleId: pricingRuleBeforeUpdate.id, // The API returns ICommunityPlatformProductPriceRule with 'id' field
        body: {
          name: "Updated Seasonal Promotion",
          enabled: true,
          applyTo: "product", // Correct camelCase
          discountType: "percentage", // Correct camelCase
          discountValue: 25, // Increased discount to 25% - Correct camelCase
          minQuantity: 3, // Reduced minimum quantity - Correct camelCase
          maxQuantity: 50, // Reduced maximum quantity - Correct camelCase
          startDate: new Date().toISOString(), // Correct camelCase
          endDate: new Date(Date.now() + 86400000 * 60).toISOString(), // Extended to 60 days - Correct camelCase
          priority: 150, // Increased priority
          targetUserGroups: ["registered"], // Correct camelCase
          targetedEntities: [product.productCode], // Use productCode instead of non-existent id
        } satisfies ICommunityPlatformProductPriceRule.IUpdate,
      },
    );
  typia.assert(updatedPricingRule);
  // Step 8: Validate using ONLY properties that exist in ICommunityPlatformProductPriceRule
  TestValidator.equals(
    "description updated",
    updatedPricingRule.description,
    "Updated Seasonal Promotion",
  );
  TestValidator.equals(
    "discount percentage updated",
    updatedPricingRule.discount_percentage,
    25,
  );
  TestValidator.equals(
    "min quantity updated",
    updatedPricingRule.minimum_quantity,
    3,
  );
  TestValidator.predicate(
    "end date extended",
    new Date(updatedPricingRule.end_date!) >
      new Date(pricingRuleBeforeUpdate.end_date!),
  );
  TestValidator.equals("is active updated", updatedPricingRule.is_active, true);
}
