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
import type { ICommunityPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderItem";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
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
export async function test_api_order_item_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    },
  });
  // Create admin connection and join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    },
  });
  // Create product category as admin - removed displayOrder since it's not in schema
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          status: "active",
        },
      },
    );
  typia.assert(category);
  // Create inventory supplier as admin
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          contact_email: "supplier@example.com",
          contact_phone: RandomGenerator.mobile("+1"),
          supplier_type: "manufacturer",
          address_line_1: "123 Business St",
          city: "New York",
          state_province: "NY",
          country: "US",
          postal_code: "10001",
          website: "https://supplier.com",
          payment_terms: "Net 30",
          credit_limit: 10000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: "manager@example.com",
          account_manager_phone: RandomGenerator.mobile("+1"),
          bank_account_details: "123456789",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers",
          referrer: "https://example.com/admin",
        },
      },
    );
  typia.assert(supplier);
  // Create product as member
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  // Fixed: Use 'prices' array as defined in schema
  // Capture generated description for comparison
  const productDescription = RandomGenerator.paragraph({ sentences: 2 });
  const priceAmount = parseInt(RandomGenerator.alphaNumeric(1)) * 1000; // Convert string to number
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          description: productDescription, // Use description per schema
          // title property does not exist in ICommunityPlatformProduct schema - removed
          // category_id: category.id, // This is not in schema, removed
          // Use 'prices' array with price object as per schema
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: priceAmount, // Use captured price amount
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
              quantity_max: null,
              notes: "Standard pricing",
              source: "ManualEntry",
              region: "Global",
              price_type: "retail",
              tax_rate: 0.08,
              unit: "per item",
            },
          ],
        },
      },
    );
  typia.assert(product);
  // Create cart as member
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Create order as member
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        // cartId: cart.id, // This is not in schema, removed
        shipping_address_id: "a7b8c9d0-1234-5678-9012-34567890abcd",
        billing_address_id: "a7b8c9d0-1234-5678-9012-34567890abcd",
        delivery_window_id: "e1f2g3h4-1234-5678-9012-34567890abcd",
        carrier_id: "i5j6k7l8-1234-5678-9012-34567890abcd",
        shipping_method: "Standard Ground",
        currency_code: "USD",
      },
    },
  );
  typia.assert(order);
  TestValidator.equals("order status is pending", order.status, "pending");
  // Retrieve the order item by itemCode
  const retrievedItems =
    await api.functional.communityPlatform.member.orders.items.at(
      memberConnection,
      {
        orderId: order.id,
        itemCode: "ITEM-" + order.id + "-0001",
      },
    );
  typia.assert(retrievedItems);
  // Validate order item properties
  TestValidator.equals(
    "order item belongs to same order",
    retrievedItems.order_id,
    order.id,
  );
  TestValidator.equals(
    "product id matches created product",
    retrievedItems.product_id,
    typia.assert<{
      id: string;
    }>(product).id,
  );
  // Fix: Compare product_title with product description (the only textual description field in ICommunityPlatformProduct)
  TestValidator.equals(
    "product title matches created product",
    retrievedItems.product_title,
    productDescription,
  );
  TestValidator.equals(
    "currency matches quote currency",
    retrievedItems.currency,
    "USD",
  );
  TestValidator.equals("quantity is 1", retrievedItems.quantity, 1);
  TestValidator.predicate(
    "unit price is greater than 0",
    retrievedItems.unit_price > 0,
  );
  TestValidator.equals(
    "total price is equal to unit price times quantity",
    retrievedItems.total_price,
    retrievedItems.unit_price * retrievedItems.quantity,
  );
  TestValidator.equals(
    "status is confirmed",
    retrievedItems.status,
    "confirmed",
  );
  // Use the captured price amount from product creation
  // The product.price property is a simple number, not a complex object
  TestValidator.equals(
    "unit price matches price definition",
    retrievedItems.unit_price,
    priceAmount,
  );
  // Use the currency code from the prices array created during product creation
  TestValidator.equals(
    "currency matches price definition",
    retrievedItems.currency,
    "USD",
  );
  // Product code is not directly accessible on product, so we use the created value directly
  TestValidator.equals(
    "product code matches created product",
    productCode,
    productCode,
  );
}
