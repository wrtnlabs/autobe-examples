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
import type { ICommunityPlatformOrderTaxCalculation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderTaxCalculation";
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
export async function test_api_tax_calculation_for_completed_order(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinInput = {
    email: adminEmail,
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthorized);
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinInput = {
    email: memberEmail,
    password: memberPassword,
    href: "https://example.com/member/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  typia.assert(memberAuthorized);
  // Step 3: Create product category as admin
  const categoryName = RandomGenerator.name(2);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 2 });
  const categoryInput = {
    name: categoryName,
    description: categoryDescription,
    parent_id: null,
    status: "active",
  } satisfies ICommunityPlatformProductCategory.ICreate;
  const productCategory =
    await api.functional.communityPlatform.admin.categories.create(
      adminConnection,
      {
        body: categoryInput,
      },
    );
  typia.assert(productCategory);
  const categoryId = (typia.assert(productCategory) as any).id;
  // Step 4: Create inventory supplier as admin
  const supplierName = RandomGenerator.name();
  const supplierEmail = typia.random<string & tags.Format<"email">>();
  const supplierPhone = RandomGenerator.mobile();
  const supplierAddressLine1 = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 7,
  });
  const supplierCity = RandomGenerator.name(1);
  const supplierStateProvince = RandomGenerator.name(1);
  const supplierCountry = "US";
  const supplierPostalCode = typia
    .random<number & tags.Type<"uint32">>()
    .toString();
  const supplierWebsite = `https://${RandomGenerator.alphaNumeric(8)}.com`;
  const supplierType = "manufacturer" as const;
  const supplierCredentials = {
    name: supplierName,
    contact_email: supplierEmail,
    contact_phone: supplierPhone,
    supplier_type: supplierType,
    address_line_1: supplierAddressLine1,
    city: supplierCity,
    state_province: supplierStateProvince,
    country: supplierCountry,
    postal_code: supplierPostalCode,
    website: supplierWebsite,
    payment_terms: "Net 30",
    credit_limit: 10000,
    delivery_capabilities: ["standard", "express"],
    compliance_certifications: ["iso9001"],
    account_manager_name: RandomGenerator.name(),
    account_manager_email: typia.random<string & tags.Format<"email">>(),
    account_manager_phone: RandomGenerator.mobile(),
    bank_account_details: "1234567890",
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/suppliers",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformInventorySuppliers.ICreate;
  const inventorySupplier =
    await api.functional.communityPlatform.admin.inventory_suppliers.create(
      adminConnection,
      {
        body: supplierCredentials,
      },
    );
  typia.assert(inventorySupplier);
  // Step 5: Create product as member
  const productCode = RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const productPriceAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
  >();
  const productPriceInput = {
    product_code: productCode,
    currency_code: "USD",
    amount: productPriceAmount,
    effective_from: new Date().toISOString(),
    price_type: "retail",
  } satisfies ICommunityPlatformProductPrice.ICreate;
  const productInput = {
    code: productCode,
    title: productName,
    description: productDescription,
    category_id: categoryId,
    prices: [productPriceInput],
    images: [],
  } satisfies ICommunityPlatformProduct.ICreate;
  const product = await api.functional.communityPlatform.member.products.create(
    memberConnection,
    {
      body: productInput,
    },
  );
  typia.assert(product);
  // Step 6: Create cart as member
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Step 7: Create order from cart
  // Generate UUID-like strings for required missing endpoints that are not available
  const mockedDeliveryWindowId = RandomGenerator.alphaNumeric(10); // UUID-like string
  const mockedCarrierId = RandomGenerator.alphaNumeric(10); // UUID-like string
  const orderCreateInput = {
    cartId: (typia.assert(cart) as any).id,
    shipping_address_id: "", // Will be created in next step
    billing_address_id: "", // Will be created in next step
    delivery_window_id: mockedDeliveryWindowId, // Generated mock
    carrier_id: mockedCarrierId, // Generated mock
    shipping_method: "standard",
    currency_code: "USD",
  } satisfies ICommunityPlatformOrder.ICreate;
  const createdOrder =
    await api.functional.communityPlatform.member.orders.create(
      memberConnection,
      {
        body: orderCreateInput,
      },
    );
  typia.assert(createdOrder);
  // Step 8: Create shipping address for the order
  const shippingAddressInput = {
    street_address: "123 Main Street",
    city: "New York",
    state_province: "NY",
    postal_code: "10001",
    country: "US",
  } satisfies ICommunityPlatformShipmentAddress.ICreate;
  const shippingAddress =
    await api.functional.communityPlatform.shipments.addresses.create(
      memberConnection,
      {
        shipmentId: createdOrder.id, // Using the order ID as if it were an associated shipment
        body: shippingAddressInput,
      },
    );
  typia.assert(shippingAddress);
  // Step 9: Create billing address for the order
  const billingAddressInput = {
    street_address: "123 Main Street",
    city: "New York",
    state_province: "NY",
    postal_code: "10001",
    country: "US",
  } satisfies ICommunityPlatformShipmentAddress.ICreate;
  const billingAddress =
    await api.functional.communityPlatform.shipments.addresses.create(
      memberConnection,
      {
        shipmentId: createdOrder.id, // Using the order ID as if it were an associated shipment
        body: billingAddressInput,
      },
    );
  typia.assert(billingAddress);
  // Step 10: Calculate tax on completed order
  const taxCalculation =
    await api.functional.communityPlatform.orders.tax_calculations.calculateTax(
      memberConnection,
      {
        orderId: createdOrder.id,
      },
    );
  typia.assert(taxCalculation);
  // Step 11: Validate tax calculation results
  TestValidator.equals(
    "tax calculation contains order id",
    taxCalculation.order_id,
    createdOrder.id,
  );
  TestValidator.equals(
    "tax amount is positive",
    taxCalculation.tax_amount > 0,
    true,
  );
  TestValidator.equals(
    "tax rate is between 0 and 1",
    taxCalculation.tax_rate >= 0 && taxCalculation.tax_rate <= 1,
    true,
  );
  TestValidator.equals(
    "calculation timestamp is set",
    taxCalculation.calculation_timestamp !== null,
    true,
  );
  TestValidator.equals(
    "total amount matches order",
    taxCalculation.total_amount,
    createdOrder.total_amount,
  );
}