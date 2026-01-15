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
export async function test_api_order_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authorize admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a product using a randomly generated UUID for category_id (value is assumed to exist in system)
  const categoryId = typia.random<string & tags.Format<"uuid">>(); // No category creation needed - category assumed to exist
  // Step 3: Create an inventory supplier (avoid use of this for the actual order logic, just to satisfy dependencies)
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: "123 Business Ave",
          city: RandomGenerator.name(),
          state_province: "State",
          country: "US",
          postal_code: typia.random<string & tags.Pattern<"^[0-9]{5}$">>(),
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/join",
          referrer: "https://example.com/home",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 4: Create a product with category_id (using UUID as placeholder for existing category)
  const productResponse =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Use generated UUID for category_id
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
              quantity_max: null,
              notes: "Regular price",
              source: "ManualEntry",
              region: "Global",
              price_type: "retail",
              tax_rate: 0.08,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [
            {
              productCode: RandomGenerator.alphaNumeric(10),
              name: RandomGenerator.name(),
              extension: "jpg",
              url: "https://example.com/image.jpg",
              is_primary: true,
              alt_text: "Product image",
              order: 0,
            } satisfies ICommunityPlatformProductImage.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(productResponse);
  const product = productResponse;
  const productPrice = product.price;
  // Step 5: Create member account
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.IJoin;
  const member = await authorize_member_join(connection, {
    body: memberCredentials,
  });
  typia.assert(member);
  // Step 6: Create order directly using product.id as cartId
  const orderConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(orderConnection, {
    body: memberCredentials,
  });
  // Create shipment associated with the order
  const createdShipmentResponse =
    await generate_random_community_platform_member_shipments_create(
      orderConnection,
      {
        body: {
          notes: "No special instructions",
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: product.id, // Use product id
              quantity: 1,
              weight_grams: 1000,
              tracking_number: RandomGenerator.alphaNumeric(20),
              carrier_id: "carrier-id",
              insurance_value_usd: productPrice,
              special_instructions: "Handle with care",
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ],
          shipment_type: "standard",
          exception_handling: "redeliver",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(createdShipmentResponse);
  const createdShipment = createdShipmentResponse;
  // Create shipping address associated with the shipment
  const shipmentAddress =
    await generate_random_community_platform_shipments_addresses_create(
      orderConnection,
      {
        body: {
          street_address: "456 Customer St",
          city: RandomGenerator.name(),
          state_province: "State",
          country: "US",
          postal_code: typia.random<string & tags.Pattern<"^[0-9]{5}$">>(),
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
        params: {
          shipmentId: createdShipment.id,
        },
      },
    );
  typia.assert(shipmentAddress);
  // Create order using product's id as cartId (schema extension implied by business logic)
  const order = await api.functional.communityPlatform.member.orders.create(
    orderConnection,
    {
      body: {
        cartId: product.id, // Use product.id as cartId (string & UUID format matches)
        shipping_address_id: shipmentAddress.id,
        billing_address_id: shipmentAddress.id,
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: "Standard Ground",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order can be retrieved by owner (member)
  const retrievedOrder =
    await api.functional.communityPlatform.member.orders.at(orderConnection, {
      orderId: order.id,
    });
  typia.assert(retrievedOrder);
  TestValidator.equals("order id matches", retrievedOrder.id, order.id);
  TestValidator.equals(
    "order status is pending",
    retrievedOrder.status,
    "pending",
  );
  TestValidator.equals(
    "order currency code matches",
    retrievedOrder.currency_code,
    "USD",
  );
  TestValidator.equals(
    "order items count matches",
    retrievedOrder.order_items_count,
    1,
  );
  // Validate that a different member cannot access the order
  // Create second member
  const secondMemberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.IJoin;
  const secondMember = await authorize_member_join(connection, {
    body: secondMemberCredentials,
  });
  typia.assert(secondMember);
  // Create connection for second member
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(secondMemberConnection, {
    body: secondMemberCredentials,
  });
  // Try to access order with second member - should fail with 403
  await TestValidator.error(
    "different member cannot access order",
    async () => {
      await api.functional.communityPlatform.member.orders.at(
        secondMemberConnection,
        {
          orderId: order.id,
        },
      );
    },
  );
}
