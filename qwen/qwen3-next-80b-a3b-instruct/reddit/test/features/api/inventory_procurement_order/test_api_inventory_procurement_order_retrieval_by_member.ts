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
import type { ICommunityPlatformInventoryProcurementOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryProcurementOrder";
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
import { prepare_random_community_platform_inventory_procurement_order } from "../../../prepare/prepare_random_community_platform_inventory_procurement_order";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_products_specifications_create } from "../../../generate/generate_random_community_platform_admin_products_specifications_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { generate_random_community_platform_member_inventory_procurement_orders_create } from "../../../generate/generate_random_community_platform_member_inventory_procurement_orders_create";
import { generate_random_community_platform_admin_inventory_reorder_settings_create } from "../../../generate/generate_random_community_platform_admin_inventory_reorder_settings_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_procurement_order_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/",
      },
    },
  );
  // Step 2: Create member account and authenticate
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
        href: "https://example.com/member/join",
        referrer: "https://example.com/",
      },
    });
  // Step 3: Create product category
  const category =
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
  // Extract the category ID using the fact that the system returns an object with id
  // This is a workaround due to a potential type definition gap in the system
  const categoryId =
    (category as any).id || typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [
            {
              product_code: productCode,
              currency_code: "KRW",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            },
          ],
        },
      },
    );
  // Step 5: Add product specifications (inventory tracking)
  await generate_random_community_platform_admin_products_specifications_create(
    adminConnection,
    {
      body: {
        key: "inventory_tracked",
        value: "true",
      },
      params: {
        productCode: product.productCode,
      },
    },
  );
  // Step 6: Register supplier
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
          country: "KR",
          postal_code: RandomGenerator.alphaNumeric(5),
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 1000000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123-456-7890",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/",
        },
      },
    );
  // Step 7: Configure reorder settings
  await generate_random_community_platform_admin_inventory_reorder_settings_create(
    adminConnection,
    {
      body: {
        product_id: product.id,
        minimum_stock_level: 10,
        reorder_quantity: 50,
        supplier_id: supplier.id,
        lead_time_days: 7,
      },
    },
  );
  // Step 8: Create procurement order as member
  const budgetAllocationId = typia.random<string & tags.Format<"uuid">>();
  const procurementOrder =
    await generate_random_community_platform_member_inventory_procurement_orders_create(
      memberConnection,
      {
        body: {
          target_inventory_item: product.productCode,
          desired_quantity: 25,
          justification: "Restocking inventory for upcoming sales",
          budget_allocation_id: budgetAllocationId,
          expected_delivery_date: new Date(Date.now() + 86400000).toISOString(),
        },
      },
    );
  // Step 9: Authenticate member (using the same connection with login)
  const memberAuthConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAuthConnection, {
    body: {
      email: member.email,
      password: memberPassword,
    },
  });
  // Step 10: Retrieve the procurement order as member
  const retrievedOrder =
    await api.functional.communityPlatform.member.inventory_procurement_orders.at(
      memberAuthConnection,
      {
        orderId: procurementOrder.id,
      },
    );
  typia.assert(retrievedOrder);
  // Step 11: Validate retrieved order data is correct
  TestValidator.equals(
    "order ID matches",
    retrievedOrder.id,
    procurementOrder.id,
  );
  TestValidator.equals(
    "vendor ID matches",
    retrievedOrder.vendor_id,
    supplier.id,
  );
  TestValidator.equals(
    "total amount matches",
    retrievedOrder.total_amount,
    procurementOrder.total_amount,
  );
  TestValidator.equals(
    "currency matches",
    retrievedOrder.currency,
    procurementOrder.currency,
  );
  TestValidator.equals(
    "status matches",
    retrievedOrder.status,
    procurementOrder.status,
  );
  TestValidator.equals(
    "requested date matches",
    retrievedOrder.requested_date,
    procurementOrder.requested_date,
  );
  TestValidator.equals(
    "expected delivery date matches",
    retrievedOrder.expected_delivery_date,
    procurementOrder.expected_delivery_date,
  );
  // Step 12: Create a second member to test access control
  const secondMemberPassword = RandomGenerator.alphaNumeric(16);
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(secondMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: secondMemberPassword,
        href: "https://example.com/member/join",
        referrer: "https://example.com/",
      },
    });
  // Step 13: Authenticate second member
  const secondAuthConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(secondAuthConnection, {
    body: {
      email: secondMember.email,
      password: secondMemberPassword,
    },
  });
  // Step 14: Test that second member cannot access the first member's procurement order
  await TestValidator.error(
    "member cannot retrieve another member's procurement order",
    async () => {
      await api.functional.communityPlatform.member.inventory_procurement_orders.at(
        secondAuthConnection,
        {
          orderId: procurementOrder.id,
        },
      );
    },
  );
}
