import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderReturn";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformOrderReturn";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_returns_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin account to set up the environment
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  // Step 2: Create an inventory supplier via admin
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
          credit_limit: 10000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          password: "SecurePass123!",
          postal_code: "90210",
          href: "https://example.com/supplier",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 3: Create a product category via admin
  const createdCategory =
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
  // Generate a valid UUID for the category_id since ICommunityPlatformProductCategory does not have an 'id' property in its definition
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPass123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 5: Create a product via member
  const createdProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: `PRD-${RandomGenerator.alphaNumeric(6)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Fixed: Use generated UUID instead of missing id property
          prices: [
            {
              product_code: "PRD-" + RandomGenerator.alphaNumeric(6),
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
              price_type: "retail",
            },
          ] satisfies ICommunityPlatformProduct.ICreate["prices"],
        },
      },
    );
  const product = createdProduct;
  // Step 6: Create a cart via member
  const createdCart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  // Generate a valid UUID for cartId since ICommunityPlatformCart does not have an 'id' property in its definition
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // Step 7: Create an order via member (using cart)
  const createdOrder =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: cartId, // Fixed: Use generated UUID instead of missing id property
          shipping_address_id: "c3a6b9e9-c8a4-4e5d-b1c7-2f1d9a2c4d8f",
          billing_address_id: "c3a6b9e9-c8a4-4e5d-b1c7-2f1d9a2c4d8f",
          delivery_window_id: "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8",
          carrier_id: "d5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0",
          shipping_method: "Standard Ground",
          currency_code: "USD",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  const order = createdOrder;
  // Step 8: Retrieve order returns via member (should succeed) - returns should be empty list
  const returnsPage =
    await api.functional.communityPlatform.member.orders.returns.index(
      memberConnection,
      {
        orderId: order.id,
      },
    );
  // Step 9: Verify the response structure and pagination
  typia.assert(returnsPage);
  TestValidator.equals(
    "pagination: current page",
    returnsPage.pagination.current,
    0,
  );
  TestValidator.equals("pagination: limit", returnsPage.pagination.limit, 10);
  TestValidator.equals(
    "pagination: records",
    returnsPage.pagination.records,
    0,
  );
  TestValidator.equals("pagination: pages", returnsPage.pagination.pages, 0);
  TestValidator.equals(
    "data should be empty array",
    returnsPage.data.length,
    0,
  );
  // Step 10: Verify that admin cannot access returns for member's order
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinInput.email,
      password: "SecurePass123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Admin tries to access member's order returns - should fail with 403 or 404
  await TestValidator.error(
    "admin should not access member's return requests",
    async () => {
      await api.functional.communityPlatform.member.orders.returns.index(
        adminLoginConnection,
        {
          orderId: order.id,
        },
      );
    },
  );
}
