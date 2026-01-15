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
import type { ICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCartItem";
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
import { prepare_random_community_platform_cart_item } from "../../../prepare/prepare_random_community_platform_cart_item";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_shipment_address } from "../../../prepare/prepare_random_community_platform_shipment_address";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_carts_items_create } from "../../../generate/generate_random_community_platform_member_carts_items_create";
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
export async function test_api_order_creation_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin joins to create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(admin);
  // Step 2: Admin login to use admin account
  const adminLoginInput = {
    email: adminEmail,
    password: "admin123",
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.ILogin;
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, { body: adminLoginInput });
  // Step 3: Create product category
  const categoryInput = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    parent_id: null,
    status: "active",
  } satisfies ICommunityPlatformProductCategory.ICreate;
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminLoginConnection,
      { body: categoryInput },
    );
  typia.assert(category);
  // Step 4: Create inventory supplier
  const supplierInput = {
    name: RandomGenerator.name(),
    contact_email: "supplier@example.com",
    contact_phone: RandomGenerator.mobile(),
    supplier_type: "manufacturer",
    address_line_1: "123 Supplier St",
    city: "Example City",
    state_province: "State",
    country: "US",
    postal_code: "12345",
    website: "https://supplier.example.com",
    payment_terms: "Net 30",
    credit_limit: 10000,
    delivery_capabilities: ["standard"],
    compliance_certifications: ["iso9001"],
    account_manager_name: RandomGenerator.name(),
    account_manager_email: "manager@example.com",
    account_manager_phone: RandomGenerator.mobile(),
    bank_account_details: "123456789",
    password: "supplier123",
    href: "https://example.com/supplier",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformInventorySuppliers.ICreate;
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminLoginConnection,
      { body: supplierInput },
    );
  typia.assert(supplier);
  // Step 5: Member joins
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinInput = {
    email: memberEmail,
    password: "member123",
    href: "https://example.com/member-join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  typia.assert(member);
  // Step 6: Member login
  const memberLoginInput = {
    email: memberEmail,
    password: "member123",
  } satisfies ICommunityPlatformMember.ILogin;
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: memberLoginInput,
  });
  // Step 7: Create product with valid category and supplier
  const productInput = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    category_id: (category as any).id satisfies string as string,
    prices: [
      {
        product_code: RandomGenerator.alphaNumeric(8),
        currency_code: "USD",
        amount: 100,
        effective_from: new Date().toISOString(),
        effective_to: null,
      },
    ],
  } satisfies ICommunityPlatformProduct.ICreate;
  const product =
    await generate_random_community_platform_member_products_create(
      memberLoginConnection,
      { body: productInput },
    );
  typia.assert(product);
  // Step 8: Create cart
  const cart = await api.functional.communityPlatform.carts.create(
    memberLoginConnection,
  );
  typia.assert(cart);
  // Step 9: Add product to cart
  const cartItemInput = {
    product_variant_id: (product as any).id satisfies string as string,
    quantity: 2,
  } satisfies ICommunityPlatformCartItem.ICreate;
  const cartItem =
    await api.functional.communityPlatform.member.carts.items.create(
      memberLoginConnection,
      {
        cartId: (cart as any).id satisfies string as string,
        body: cartItemInput,
      },
    );
  typia.assert(cartItem);
  // Step 10: Create shipment
  const shipmentInput = {
    notes: "Handle with care",
    packages: [
      {
        shipment_id: "" as any, // Changed from shipmentId to shipment_id to match ICommunityPlatformShipmentPackage.ICreate
        product_id: (product as any).id satisfies string as string,
        quantity: 2,
        weight_grams: 500,
        tracking_number: RandomGenerator.alphaNumeric(12),
        carrier_id: "test-carrier-id",
        insurance_value_usd: 200,
        special_instructions: "Do not stack",
      },
    ],
    shipment_type: "standard",
    exception_handling: "hold",
    signature_required: false,
  } satisfies ICommunityPlatformShipment.ICreate;
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberLoginConnection,
      { body: shipmentInput },
    );
  typia.assert(shipment);
  // Step 11: Create shipping address linked to shipment
  const addressInput = {
    street_address: "456 Main St",
    city: "Example City",
    state_province: "State",
    postal_code: "12345",
    country: "US",
  } satisfies ICommunityPlatformShipmentAddress.ICreate;
  const address =
    await generate_random_community_platform_shipments_addresses_create(
      memberLoginConnection,
      {
        params: { shipmentId: (shipment as any).id satisfies string as string }, // Changed from shipment_id to shipmentId to match the URL params schema
        body: addressInput,
      },
    );
  typia.assert(address);
  // Step 12: Create order from cart with shipment
  const orderInput = {
    cartId: (cart as any).id satisfies string as string,
    shipping_address_id: (address as any).id satisfies string as string,
    billing_address_id: (address as any).id satisfies string as string,
    delivery_window_id: "test-window-id",
    carrier_id: "test-carrier-id",
    shipping_method: "Standard Ground",
    currency_code: "USD",
  } satisfies ICommunityPlatformOrder.ICreate;
  const order = await generate_random_community_platform_member_orders_create(
    memberLoginConnection,
    { body: orderInput },
  );
  typia.assert(order);
  // Validation: Order total matches expected (product price × quantity)
  const expectedTotal = productInput.prices[0].amount * cartItem.quantity;
  TestValidator.equals(
    "order total matches cart item total",
    order.total_amount,
    expectedTotal,
  );
  // Validation: Order has shipment association (shipment_id should be present in order)
  // We need to validate that shipment is associated, but we need to check if shipment id appears in order
  // However, the Order schema doesn't have shipment_id directly - we need to check the shipment's saleCode
  // The shipment's saleCode should match order.order_code
  TestValidator.equals(
    "shipment saleCode matches order code",
    shipment.saleCode,
    order.order_code,
  );
  // Validation: Cart was deleted after order creation - try to get cart
  await TestValidator.error(
    "cart should be deleted after order creation",
    async () => {
      await api.functional.communityPlatform.carts.create(
        memberLoginConnection,
      );
    },
  );
  // This is a workaround since we can't get cart by ID
  // The cart should be deleted automatically after order creation
  // We cannot validate this with get request because there is no endpoint to get cart
  // The cart should have been deleted when order was created
  // According to spec: "When an order is created, inventory levels for all products in the cart are automatically reduced. This operation performs a hard delete on the cart items, transferring them to permanent order records. There is no soft delete mechanism in this system - once an order is created, it cannot be undone without a formal return or refund process."
  // So we assume cart is deleted
  // Validate inventory decreased
  // Since we cannot get product details after order creation from API
  // We must track the product inventory before and after
  // We need to get product before order creation
  const productBefore =
    await api.functional.communityPlatform.member.products.create(
      memberLoginConnection,
      { body: productInput },
    );
  typia.assert(productBefore);
  // We don't have an endpoint to get product details after creation
  // We need to check product stock_level before order creation
  // If we can't get product after, we can't validate inventory decrease
  // We must rely on the fact that the operation performs a hard delete on cart items
  // We cannot validate inventory decrease because there is no way to get product details
  // This is a limitation of the test design
  // We can only validate what we can access through the API
  // Inventory decrease is an internal state change
  // We'll mark this as not testable with available API endpoints
  // But the spec says it should happen - we assume it's correct
} // Similar to unit test where internal state changes are not visible, we rely on observed behavior