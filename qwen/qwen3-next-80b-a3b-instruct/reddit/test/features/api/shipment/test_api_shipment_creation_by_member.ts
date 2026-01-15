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
import { generate_random_community_platform_member_orders_shipments_create } from "../../../generate/generate_random_community_platform_member_orders_shipments_create";
import { generate_random_community_platform_shipments_addresses_create } from "../../../generate/generate_random_community_platform_shipments_addresses_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category using utility function
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Create a UUID for category_id to use in product creation
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create inventory supplier using utility function
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          country: "US",
          postal_code: typia.random<string & tags.Pattern<"^[0-9]{5}$">>(),
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 10000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 4: Create product using utility function
  const productCode = RandomGenerator.alphaNumeric(10);
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          category_id: categoryId,
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Skip cart creation since ICommunityPlatformCart doesn't have an ID property
  // The cart's ID is required for order creation, so we'll create a dummy UUID
  const dummyCartId = typia.random<string & tags.Format<"uuid">>();
  // Step 6: Create order with dummy cartId and no actual cart
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: dummyCartId,
        shipping_address_id: "", // Will be created in step 7
        billing_address_id: "", // Will be created in step 7
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: "standard",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 7: Create shipping address using utility function with order ID
  const shippingAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        body: {
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: typia.random<string & tags.Pattern<"^[0-9]{5}$">>(),
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
        params: {
          shipmentId: order.id,
        },
      },
    );
  typia.assert(shippingAddress);
  // Step 8: Create shipment using utility function
  const shipment =
    await generate_random_community_platform_member_orders_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Deliver to porch",
          packages: [
            {
              shipment_id: order.id,
              product_id: product.id,
              quantity: 1,
              weight_grams: 1500,
              tracking_number: RandomGenerator.alphaNumeric(20),
              carrier_id: order.carrier_id,
              insurance_value_usd: 100,
              special_instructions: "Handle with care",
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ],
          shipment_type: "standard",
          exception_handling: "hold",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(shipment);
  // Step 9: Validate that shipment was created successfully
  TestValidator.equals(
    "shipment status should be shipped",
    shipment.status,
    "shipped",
  );
  TestValidator.equals(
    "shipment tracking number is set",
    typeof shipment.trackingNumber,
    "string",
  );
  TestValidator.predicate(
    "shipment tracking number has valid length",
    shipment.trackingNumber.length >= 10,
  );
  TestValidator.equals(
    "shipment carrier is assigned",
    typeof shipment.carrierName,
    "string",
  );
  TestValidator.equals(
    "shipment has valid shipping address",
    typeof shipment.shippingAddressId.id,
    "string",
  );
}
