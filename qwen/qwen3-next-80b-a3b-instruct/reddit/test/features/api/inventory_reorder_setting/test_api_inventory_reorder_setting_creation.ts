import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryExternalFactorImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryExternalFactorImpact";
import type { ICommunityPlatformInventoryReorderSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryReorderSetting";
import type { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_specification } from "../../../prepare/prepare_random_community_platform_product_specification";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_inventory_reorder_setting } from "../../../prepare/prepare_random_community_platform_inventory_reorder_setting";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_products_specifications_create } from "../../../generate/generate_random_community_platform_admin_products_specifications_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { generate_random_community_platform_admin_inventory_reorder_settings_create } from "../../../generate/generate_random_community_platform_admin_inventory_reorder_settings_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_reorder_setting_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 2: Generate a fake category_id UUID (since category response has no id)
  // This is required by ICommunityPlatformProduct.ICreate category_id
  // We're assuming this UUID represents an existing category in the system
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create product with inventory tracking enabled
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.communityPlatform.member.products.create(
    adminConnection,
    {
      body: {
        code: productCode,
        title: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 1 }),
        category_id: categoryId, // Using generated UUID instead of category.id
        prices: [
          {
            product_code: productCode,
            currency_code: "USD",
            amount: typia.random<number & tags.Minimum<0>>(),
            effective_from: new Date().toISOString(),
          } satisfies ICommunityPlatformProductPrice.ICreate,
        ],
      } satisfies ICommunityPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 4: Create supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph(),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          country: "US",
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "valid-bank-details",
          password: typia.random<string & tags.MinLength<8>>(),
          href: "https://example.com/admin/supplier",
          referrer: "https://example.com",
          postal_code: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 5: Create reorder setting
  const reorderSetting =
    await generate_random_community_platform_admin_inventory_reorder_settings_create(
      adminConnection,
      {
        body: {
          product_id: product.id,
          minimum_stock_level: 10,
          reorder_quantity: 50,
          supplier_id: supplier.id,
          lead_time_days: 7,
        } satisfies ICommunityPlatformInventoryReorderSetting.ICreate,
      },
    );
  // Step 6: Validate reorder setting response structure
  typia.assert(reorderSetting);
  TestValidator.predicate(
    "reorderSetting is not null",
    reorderSetting !== null,
  );
  TestValidator.predicate(
    "month is valid date format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(
      reorderSetting.month,
    ),
  );
  TestValidator.predicate(
    "predictedQuantity is positive",
    reorderSetting.predictedQuantity > 0,
  );
  TestValidator.predicate(
    "lowerBound is positive",
    reorderSetting.lowerBound > 0,
  );
  TestValidator.predicate(
    "upperBound is positive",
    reorderSetting.upperBound > 0,
  );
  TestValidator.predicate(
    "confidenceLevel is between 0 and 1",
    reorderSetting.confidenceLevel >= 0 && reorderSetting.confidenceLevel <= 1,
  );
  TestValidator.predicate(
    "seasonalityFactor is a number",
    typeof reorderSetting.seasonalityFactor === "number",
  );
  TestValidator.predicate(
    "externalFactorsImpact is an array",
    Array.isArray(reorderSetting.externalFactorsImpact),
  );
  TestValidator.predicate(
    "reorderTrigger is a boolean",
    typeof reorderSetting.reorderTrigger === "boolean",
  );
}
