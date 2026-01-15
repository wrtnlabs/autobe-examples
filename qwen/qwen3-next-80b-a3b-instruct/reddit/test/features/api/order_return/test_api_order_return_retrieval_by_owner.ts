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
import type { ICommunityPlatformOrderReturnItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderReturnItem";
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
import { prepare_random_community_platform_order_return } from "../../../prepare/prepare_random_community_platform_order_return";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_order_return_item } from "../../../prepare/prepare_random_community_platform_order_return_item";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_member_orders_shipments_create } from "../../../generate/generate_random_community_platform_member_orders_shipments_create";
import { generate_random_community_platform_orders_returns_create } from "../../../generate/generate_random_community_platform_orders_returns_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_shipments_addresses_create } from "../../../generate/generate_random_community_platform_shipments_addresses_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_return_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member actor connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create admin actor connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Step 3: Create product category via admin
  const category:
    | ICommunityPlatformProductCategory
    | ({ id: string } & ICommunityPlatformProductCategory) =
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
  const categoryId = typia.assert<ICommunityPlatformProductCategory & { id: string }>(category).id;
  // Step 4: Create inventory supplier via admin
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
          website: "https://example.com", 
          payment_terms: "Net 30",
          credit_limit: 50000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers",
          referrer: "https://example.com/admin",
          postal_code: "90210" // Fixed: Added required postal_code property
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 5: Create product via member
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD" satisfies string as string,
              amount: Number(RandomGenerator.alphaNumeric(16)) satisfies number as number,
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1 satisfies number as number,
              quantity_max: null,
              notes: "" satisfies string as string,
              source: "ManualEntry" satisfies string as string,
              region: "" satisfies string as string,
              price_type: "" satisfies string as string,
              tax_rate: 0 satisfies number as number,
              unit: "" satisfies string as string,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  const productId = typia.assert<ICommunityPlatformProduct & { id: string }>(product).id;
  typia.assert(product);
  // Step 6: Create cart via member
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  const cartId = typia.assert<ICommunityPlatformCart & { id: string }>(cart).id;
  typia.assert(cart);
  // Step 7: Create order from cart via member
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: cartId,
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        billing_address_id: typia.random<string & tags.Format<"uuid">>(),
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: "Standard Ground" satisfies string as string,
        currency_code: "USD" satisfies string as string,
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  const orderId = typia.assert<ICommunityPlatformOrder & { id: string }>(order).id;
  typia.assert(order);
  // Step 8: Create shipment via member
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Deliver to front door" satisfies string as string,
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: productId,
              quantity: 1 satisfies number as number,
              weight_grams: 500 satisfies number as number,
              tracking_number: RandomGenerator.alphaNumeric(15) satisfies string as string,
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 100 satisfies number as number,
              special_instructions: "Handle with care" satisfies string as string,
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ],
          shipment_type: "standard" satisfies "standard" as "standard",
          exception_handling: "leave_at_door" as "leave_at_door",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  const shipmentId = typia.assert<ICommunityPlatformShipment & { id: string }>(shipment).id;
  const carrierId = shipment.carrierId; // Already defined on ICommunityPlatformShipment
  typia.assert(shipment);
  // Step 9: Create shipping address via member
  const address =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        body: {
          street_address: RandomGenerator.paragraph({ sentences: 1 }) satisfies string as string,
          city: RandomGenerator.name(1) satisfies string as string,
          state_province: RandomGenerator.name(1) satisfies string as string,
          postal_code: RandomGenerator.alphaNumeric(8) satisfies string as string,
          country: "US" satisfies string as string,
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
        params: {
          shipmentId: shipmentId,
        },
      },
    );
  typia.assert(address);
  // Step 10: Create order shipment to link shipment with order via member
  const orderShipment =
    await generate_random_community_platform_member_orders_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Shipment link" satisfies string as string,
          packages: [
            {
              shipment_id: shipmentId,
              product_id: productId,
              quantity: 1 satisfies number as number,
              weight_grams: 500 satisfies number as number,
              tracking_number: RandomGenerator.alphaNumeric(15) satisfies string as string,
              carrier_id: carrierId,
              insurance_value_usd: 100 satisfies number as number,
              special_instructions: "Handle with care" satisfies string as string,
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ],
          shipment_type: "standard" satisfies "standard" as "standard",
          exception_handling: "leave_at_door" as "leave_at_door",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
        params: {
          orderId: orderId,
        },
      },
    );
  typia.assert(orderShipment);
  // Step 11: Create return request via member (same actor who created order)
  // We need to get the actual order item ID from the order
  // Since no API exists to get order items, we'll use a placeholder UUID
  const returnRequest =
    await generate_random_community_platform_orders_returns_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }) satisfies string as string,
          condition: "Used" satisfies string as string,
          selected_items: [
            {
              order_item_id: "00000000-0000-0000-0000-000000000000" satisfies string as string,
              quantity: 1 satisfies number as number,
            } satisfies ICommunityPlatformOrderReturnItem.ICreate,
          ],
        } satisfies ICommunityPlatformOrderReturn.ICreate,
        params: {
          orderId: orderId,
        },
      },
    );
  const returnId = typia.assert<ICommunityPlatformOrderReturn & { id: string }>(returnRequest).id;
  typia.assert(returnRequest);
  // Step 12: Retrieve the return details via the same member owner
  const retrievedReturn =
    await api.functional.communityPlatform.orders.returns.at(memberConnection, {
      orderId: orderId,
      returnId: returnId,
    });
  typia.assert(retrievedReturn);
  // Validate return details match
  TestValidator.equals(
    "return status should be requested",
    retrievedReturn.return_status,
    "requested",
  );
  TestValidator.equals(
    "return reason should match",
    retrievedReturn.reason,
    returnRequest.reason,
  );
  TestValidator.equals(
    "return condition should match",
    retrievedReturn.condition,
    returnRequest.condition,
  );
  TestValidator.equals(
    "return refund amount should match",
    retrievedReturn.refund_amount,
    0,
  ); // Default refund on creation
  TestValidator.equals(
    "return requested_at should be set",
    retrievedReturn.requested_at !== undefined,
    true,
  );
  TestValidator.equals(
    "return approved_at should be null",
    retrievedReturn.approved_at,
    null,
  );
  TestValidator.equals(
    "return received_at should be null",
    retrievedReturn.received_at,
    null,
  );
  TestValidator.equals(
    "return processed_at should be null",
    retrievedReturn.processed_at,
    null,
  );
  TestValidator.equals(
    "return completed_at should be null",
    retrievedReturn.completed_at,
    null,
  );
  TestValidator.equals(
    "return rejected_at should be null",
    retrievedReturn.rejected_at,
    null,
  );
  TestValidator.equals(
    "return cancelled_at should be null",
    retrievedReturn.cancelled_at,
    null,
  );
  // Validate only owner can access - attempt access as admin should fail
  await TestValidator.error(
    "admin should not be able to access member's return",
    async () => {
      await api.functional.communityPlatform.orders.returns.at(
        adminConnection,
        {
          orderId: orderId,
          returnId: returnId,
        },
      );
    },
  );
}