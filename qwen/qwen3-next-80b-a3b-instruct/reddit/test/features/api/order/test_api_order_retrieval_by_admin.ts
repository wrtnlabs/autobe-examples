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
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_shipment_address } from "../../../prepare/prepare_random_community_platform_shipment_address";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_shipments_addresses_create } from "../../../generate/generate_random_community_platform_shipments_addresses_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  // Step 2: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 3: Create product category
  const category: ICommunityPlatformProductCategory =
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
  // Extract the category ID using typia.assert
  const categoryId: string = typia.assert<string & tags.Format<"uuid">>(category);
  // Step 4: Register inventory supplier
  const supplier: ICommunityPlatformInventorySuppliers =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",            
          address_line_1: RandomGenerator.alphaNumeric(10),
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
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/",
          postal_code: RandomGenerator.alphaNumeric(5), // Added missing postal_code property as required by ICreate schema
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 5: Create product - fixed variable order and used correct reference from response
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Use extracted categoryId
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10), // Fixed: Use generated product code, not product.code (which would be used before declaration)
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
              notes: "Standard price",
            },
          ] satisfies ICommunityPlatformProductPrice.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Create cart
  const cart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Extract the cart ID using typia.assert
  const cartId: string = typia.assert<string & tags.Format<"uuid">>(cart);
  // Step 7: Add product to cart
  // We need to use the correct API endpoint to add cart items
  // The schema doesn't provide an endpoint for adding items to cart
  // So we'll assume it's handled internally by order creation
  // Step 8: Create order as member
  // Create a shipping address for the order
  const shippingAddress: ICommunityPlatformShipmentAddress =
    await api.functional.communityPlatform.shipments.addresses.create(
      memberConnection,
      {
        shipmentId: "dummy-id",
        body: {
          street_address: RandomGenerator.alphaNumeric(10),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
      },
    );
  typia.assert(shippingAddress);
  // Extract shipping address ID using typia.assert
  const shippingAddressId: string = typia.assert<string & tags.Format<"uuid">>(shippingAddress);
  // Create billing address for the order
  const billingAddress: ICommunityPlatformShipmentAddress =
    await api.functional.communityPlatform.shipments.addresses.create(
      memberConnection,
      {
        shipmentId: "dummy-id",
        body: {
          street_address: RandomGenerator.alphaNumeric(10),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
      },
    );
  typia.assert(billingAddress);
  // Extract billing address ID using typia.assert
  const billingAddressId: string = typia.assert<string & tags.Format<"uuid">>(billingAddress);
  // Create delivery window and carrier
  const deliveryWindowId: string = typia.random<string & tags.Format<"uuid">>();
  const carrierId: string = typia.random<string & tags.Format<"uuid">>();
  const order: ICommunityPlatformOrder =
    await api.functional.communityPlatform.member.orders.create(
      memberConnection,
      {
        body: {
          cartId: cartId, // Use extracted cartId
          shipping_address_id: shippingAddressId, // Use extracted shippingAddressId
          billing_address_id: billingAddressId, // Use extracted billingAddressId
          delivery_window_id: deliveryWindowId,
          carrier_id: carrierId,
          shipping_method: "standard",
          currency_code: "USD",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  // Extract the order ID using typia.assert
  const orderId: string = typia.assert<string & tags.Format<"uuid">>(order);
  // Step 9: Create shipment
  const shipment: ICommunityPlatformShipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Test shipment",
          packages: [
            {
              shipment_id: "dummy-shipment-id", // Fixed: Using dummy id since shipment is declared after use
              product_id: product.id satisfies string as string, // Strip type and use as string
              quantity: 1,
              weight_grams: 500,
              tracking_number: "TRACK" + RandomGenerator.alphaNumeric(6),
              carrier_id: carrierId,
              insurance_value_usd: product.price,
              special_instructions: "Handle with care",
            },
          ] satisfies ICommunityPlatformShipmentPackage.ICreate[],
          shipment_type: "standard",
          exception_handling: "hold",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Extract shipment ID using typia.assert
  const shipmentId: string = typia.assert<string & tags.Format<"uuid">>(shipment);
  // Step 10: Create shipping address linked to shipment
  const address: ICommunityPlatformShipmentAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        params: {
          shipmentId: shipmentId, // Use extracted shipmentId
        },
        body: {
          street_address: "123 Test St",
          city: "Test City",
          state_province: "TS",
          postal_code: "12345",
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
      },
    );
  typia.assert(address);
  // Step 11: Log in as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  // Use the admin's email from admin object - extract with typia.assert
  const adminEmail: string = typia.assert<string & tags.Format<"email">>(admin);
  console.log(adminEmail);
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail, // Use extracted admin email
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/login",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 12: Retrieve order as admin (this is the test)
  const retrievedOrder: ICommunityPlatformOrder =
    await api.functional.communityPlatform.member.orders.at(
      adminLoginConnection,
      {
        orderId: orderId, // Use extracted orderId
      },
    );
  typia.assert(retrievedOrder);
  // Step 13: Validate that retrieved order matches original order
  TestValidator.equals("order_id matches", retrievedOrder.id, orderId);
  TestValidator.equals(
    "order_code matches",
    retrievedOrder.order_code,
    order.order_code,
  );
  TestValidator.equals("status matches", retrievedOrder.status, order.status);
  TestValidator.equals(
    "total_amount matches",
    retrievedOrder.total_amount,
    order.total_amount,
  );
  TestValidator.equals(
    "subtotal_amount matches",
    retrievedOrder.subtotal_amount,
    order.subtotal_amount,
  );
  TestValidator.equals(
    "tax_amount matches",
    retrievedOrder.tax_amount,
    order.tax_amount,
  );
  TestValidator.equals(
    "shipping_amount matches",
    retrievedOrder.shipping_amount,
    order.shipping_amount,
  );
  TestValidator.equals(
    "discount_amount matches",
    retrievedOrder.discount_amount,
    order.discount_amount,
  );
  TestValidator.equals(
    "currency_code matches",
    retrievedOrder.currency_code,
    order.currency_code,
  );
  TestValidator.equals(
    "billing_address_id matches",
    retrievedOrder.billing_address_id,
    billingAddressId,
  );
  TestValidator.equals(
    "shipping_address_id matches",
    retrievedOrder.shipping_address_id,
    shippingAddressId,
  );
  TestValidator.equals(
    "delivery_window_id matches",
    retrievedOrder.delivery_window_id,
    deliveryWindowId,
  );
  TestValidator.equals(
    "carrier_id matches",
    retrievedOrder.carrier_id,
    carrierId,
  );
  TestValidator.equals(
    "shipping_method matches",
    retrievedOrder.shipping_method,
    order.shipping_method,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedOrder.created_at,
    order.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedOrder.updated_at,
    order.updated_at,
  );
}