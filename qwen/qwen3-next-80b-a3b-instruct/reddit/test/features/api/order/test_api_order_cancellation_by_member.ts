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
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_shipments_addresses_create } from "../../../generate/generate_random_community_platform_shipments_addresses_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_cancellation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for order
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create product category (using admin credentials)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const categoryRaw =
    await api.functional.communityPlatform.admin.categories.create(
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
  // Assuming the actual response has an id property despite not being in the DTO
  const category: any = categoryRaw;
  const categoryId = category.id;
  // Step 3: Register inventory supplier (using admin credentials)
  const supplier =
    await api.functional.communityPlatform.admin.inventory_suppliers.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph(),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          country: "US",
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 10000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "account-info",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers",
          referrer: "https://example.com",
          postal_code: typia.random<
            string & tags.Pattern<"^\\d{5}(?:\\-\\d{4})?$">
          >(),
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 4: Create product
  const productData = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(),
    description: RandomGenerator.content(),
    category_id: categoryId, // Use extracted category ID
    prices: [
      {
        product_code: RandomGenerator.alphaNumeric(8),
        currency_code: "USD",
        amount: typia.random<number & tags.Minimum<0> & tags.Maximum<1000>>(),
        effective_from: new Date().toISOString(),
        effective_to: null,
      } satisfies ICommunityPlatformProductPrice.ICreate,
    ],
  } satisfies ICommunityPlatformProduct.ICreate;
  const product = await api.functional.communityPlatform.member.products.create(
    memberConnection,
    {
      body: productData,
    },
  );
  typia.assert(product);
  // Step 5: Create cart
  const cartRaw =
    await api.functional.communityPlatform.carts.create(memberConnection);
  // Assuming the actual response has an id property despite not being in the DTO
  const cart: any = cartRaw;
  const cartId = cart.id;
  // Step 6: Create shipment address with dummy shipmentId
  const addressId = typia.random<string & tags.Format<"uuid">>();
  // Create a dummy shipmentId to be able to create the address
  // This is a workaround since we need the address before order creation
  const shipmentIdForAddress = addressId; // Use the address ID as the shipment ID temporarily
  const shippingAddressRaw =
    await api.functional.communityPlatform.shipments.addresses.create(
      memberConnection,
      {
        shipmentId: shipmentIdForAddress,
        body: {
          street_address: RandomGenerator.paragraph(),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: typia.random<
            string & tags.Pattern<"^\\d{5}(?:\\-\\d{4})?$">
          >(),
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
      },
    );
  const shippingAddress = typia.assert(shippingAddressRaw);
  const shippingAddressId = shippingAddress.id;
  const billingAddressId = shippingAddressId;
  // Step 7: Create order from cart
  const orderRaw = await api.functional.communityPlatform.member.orders.create(
    memberConnection,
    {
      body: {
        cartId: cartId,
        shipping_address_id: shippingAddressId,
        billing_address_id: billingAddressId,
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: "standard",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  const order = typia.assert(orderRaw);
  // Step 8: Create shipment for order
  const shipmentRaw =
    await api.functional.communityPlatform.member.orders.shipments.create(
      memberConnection,
      {
        orderId: order.id,
        body: {
          notes: RandomGenerator.paragraph({ sentences: 2 }),
          packages: [
            {
              shipment_id: order.id,
              product_id: product.id,
              quantity: 1,
              weight_grams: 1000,
              tracking_number: RandomGenerator.alphaNumeric(20),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 100,
              special_instructions: "Handle with care",
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ],
          shipment_type: "standard",
          exception_handling: "hold",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  const shipment = typia.assert(shipmentRaw);
  // Step 9: Cancel order as the member who created it
  const cancellation =
    await api.functional.communityPlatform.member.orders.cancellations.erase(
      memberConnection,
      {
        orderId: order.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformOrder.ICancel,
      },
    );
  typia.assert(cancellation);
  TestValidator.equals(
    "order status should be cancelled",
    cancellation.status,
    "cancelled",
  );
  // Step 10: Verify that another member cannot cancel the same order
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(otherMember);
  await TestValidator.error(
    "other member cannot cancel another's order",
    async () => {
      await api.functional.communityPlatform.member.orders.cancellations.erase(
        otherMemberConnection,
        {
          orderId: order.id,
          body: {
            reason: "Tried to cancel another member's order",
          } satisfies ICommunityPlatformOrder.ICancel,
        },
      );
    },
  );
}
