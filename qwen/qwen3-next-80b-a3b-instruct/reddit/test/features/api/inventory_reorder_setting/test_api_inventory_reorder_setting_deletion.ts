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
export async function test_api_inventory_reorder_setting_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 3: Create product - create product info *before* using it in prices
  const productCode: string = RandomGenerator.alphaNumeric(8);
  const productName: string = RandomGenerator.name();
  const productDescription: string = RandomGenerator.content();
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Create price with valid types
  const price = {
    product_code: productCode,
    currency_code: "KRW" satisfies string & tags.Pattern<"^[A-Z]{3}$">,
    amount: typia.random<number & tags.Minimum<0>>(),
    effective_from: new Date().toISOString(),
    effective_to: null,
    quantity_min: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    quantity_max: null,
    notes: "" satisfies string,
    source: "" satisfies string,
    region: "" satisfies string,
    price_type: "" satisfies string,
    tax_rate: undefined,
    unit: "" satisfies string,
  } satisfies ICommunityPlatformProduct.ICreate["prices"][0];
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: productCode,
          title: productName,
          description: productDescription,
          category_id: productId,
          prices: [price],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 4: Create product specification
  const specification =
    await generate_random_community_platform_admin_products_specifications_create(
      adminConnection,
      {
        body: {
          key: "inventory_tracking",
          value: "true",
        } satisfies ICommunityPlatformProductSpecification.ICreate,
        params: {
          productCode: product.productCode,
        },
      },
    );
  typia.assert(specification);
  // Step 5: Create inventory supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: "+821012345678" satisfies string &
            tags.Pattern<"^\\+?[1-9]\\d{1,14}$">,
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph(),
          address_line_2: "" satisfies string,
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          country: "KR",
          postal_code: typia.random<string & tags.Pattern<"^\\d{5}$">>(),
          website: "https://example.com" satisfies string & tags.Format<"uri">,
          payment_terms: "Net 30",
          credit_limit: typia.random<number & tags.Minimum<0>>(),
          delivery_capabilities: [] satisfies (
            | "standard"
            | "express"
            | "overnight"
            | "cold-chain"
            | "hazardous-materials"
            | "large-volume"
            | "international"
            | "local"
          )[],
          compliance_certifications: [] satisfies (
            | "iso9001"
            | "iso14001"
            | "iso45001"
            | "fda"
            | "haccp"
            | "gmp"
            | "bcorp"
            | "fsc"
            | "fair-trade"
            | "other"
          )[],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: "+821012345678" satisfies string &
            tags.Pattern<"^\\+?[1-9]\\d{1,14}$">,
          bank_account_details: "account info",
          notes: "Testing supplier",
          password: typia.random<string & tags.MinLength<8>>(),
          ip: null,
          href: "https://example.com/admin/suppliers",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 6: Create inventory reorder setting
  const reorderSetting =
    await generate_random_community_platform_admin_inventory_reorder_settings_create(
      adminConnection,
      {
        body: {
          product_id: product.id,
          minimum_stock_level: 10,
          reorder_quantity: 25,
          supplier_id: supplier.id,
          lead_time_days: 5,
        } satisfies ICommunityPlatformInventoryReorderSetting.ICreate,
      },
    );
  typia.assert(reorderSetting);
  // Step 7: Delete the inventory reorder setting
  await api.functional.communityPlatform.admin.inventory_reorder_settings.erase(
    adminConnection,
    {
      settingId: product.id,
    },
  );
  // Step 8: Verify the reorder setting has been deleted
  await TestValidator.error(
    "deleted reorder setting should not be found",
    async () => {
      await api.functional.communityPlatform.admin.inventory_reorder_settings.create(
        adminConnection,
        {
          body: {
            product_id: product.id,
            minimum_stock_level: 10,
            reorder_quantity: 25,
            supplier_id: supplier.id,
            lead_time_days: 5,
          } satisfies ICommunityPlatformInventoryReorderSetting.ICreate,
        },
      );
    },
  );
}
