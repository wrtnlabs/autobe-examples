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

export async function test_api_order_returns_access_denied_for_non_owner(
  connection: api.IConnection,
) {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  
  // Step 2: Create product category as admin and get returned category with id
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
  const categoryId = typia.assert<{ id: string }>(createdCategory).id;
  
  // Step 3: Create inventory supplier as admin
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
          website: typia.random<string & tags.Format<"uri">>(),
          payment_terms: "Net 30",
          credit_limit: 10000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "account-number",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/admin",
          postal_code: "90210"
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  
  // Step 4: Create first member (order owner) and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  
  // Step 5: Create cart for owner member
  const ownerCart =
    await api.functional.communityPlatform.carts.create(ownerConnection);
  typia.assert(ownerCart);
  const cartId = typia.assert<{ id: string }>(ownerCart).id;
  
  // Step 6: Create product as owner member using returned category id
  const product =
    await generate_random_community_platform_member_products_create(
      ownerConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Use extracted categoryId
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8), // Correct - use generated code, but we need actual product code
              currency_code: "USD",
              amount: 50,
              effective_from: new Date().toISOString(),
              effective_to: null,
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  
  // Step 7: Create required entities for order
  // Create shipping address
  const shippingAddressId = "123e4567-e89b-12d3-a456-426614174000"; // Use a correct generic UUID for test
  // Create billing address
  const billingAddressId = "123e4567-e89b-12d3-a456-426614174001"; // Use a correct generic UUID for test
  // Create delivery window
  const deliveryWindowId = "123e4567-e89b-12d3-a456-426614174002"; // Use a correct generic UUID for test
  // Create carrier
  const carrierId = "123e4567-e89b-12d3-a456-426614174003"; // Use a correct generic UUID for test
  
  // Step 8: Create order as owner member with properly referenced data using returned cart id
  const order = await generate_random_community_platform_member_orders_create(
    ownerConnection,
    {
      body: {
        cartId: cartId, // Use extracted cartId
        shipping_address_id: shippingAddressId,
        billing_address_id: billingAddressId,
        delivery_window_id: deliveryWindowId,
        carrier_id: carrierId,
        shipping_method: "Standard Ground",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  
  // Step 9: Create second member (non-owner) and authenticate
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerMember = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  
  // Step 10: Create cart for non-owner member
  const nonOwnerCart =
    await api.functional.communityPlatform.carts.create(nonOwnerConnection);
  typia.assert(nonOwnerCart);
  
  // Step 11: Attempt to access return requests for order created by owner member
  await TestValidator.error(
    "non-owner member cannot access return requests for order they didn't create",
    async () => {
      await api.functional.communityPlatform.member.orders.returns.index(
        nonOwnerConnection,
        {
          orderId: order.id, // Use actual order object's id
        },
      );
    },
  );
}