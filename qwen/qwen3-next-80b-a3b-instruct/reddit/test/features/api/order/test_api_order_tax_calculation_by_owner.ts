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
import type { ICommunityPlatformOrderTaxCalculations } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderTaxCalculations";
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
export async function test_api_order_tax_calculation_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to create product categories and inventory suppliers
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a product category for products used in orders
  const productCategoryResponse =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(productCategoryResponse);
  // Extract the actual ID from the response
  const productCategory = typia.assert<ICommunityPlatformProductCategory & { id: string }>(productCategoryResponse);
  // Step 3: Register an inventory supplier for product procurement
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: "Tech Supplier Inc.",
          contact_email: "contact@techsupplier.com",
          contact_phone: "+1234567890",
          supplier_type: "manufacturer",
          address_line_1: "123 Tech Street",
          city: "San Jose",
          state_province: "CA",
          country: "US",
          postal_code: "95131",
          website: "https://techsupplier.com",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001", "fda"],
          account_manager_name: "John Doe",
          account_manager_email: "john.doe@techsupplier.com",
          account_manager_phone: "+1234567890",
          bank_account_details: "1234567890",
          password: "SupplierPassword123!",
          href: "https://example.com/suppliers/new",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 4: Authenticate as member
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
  // Step 5: Create a product listing for inclusion in order
  const productCode = RandomGenerator.alphaNumeric(10);
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: "Wireless Headphones",
          description: "Premium wireless headphones with noise cancellation",
          category_id: productCategory.id,
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: 199.99,
              effective_from: new Date().toISOString(),
              tax_rate: 0.085,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Create a shipping address
  const shippingAddress =
    await api.functional.communityPlatform.shipments.addresses.create(
      memberConnection,
      {
        body: {
          street_address: "456 Main Street",
          city: "San Francisco",
          state_province: "CA",
          postal_code: "94105",
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
        shipmentId: "dummy-id", 
      },
    );
  typia.assert(shippingAddress);
  // Step 7: Create an order from cart with shipping reference
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: "dummy-cart-id",
        shipping_address_id: shippingAddress.id,
        billing_address_id: shippingAddress.id,
        delivery_window_id: "w1-2024",
        carrier_id: "carrier-123",
        shipping_method: "Standard Ground",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 8: Retrieve tax calculation details for the order
  const taxCalculations =
    await api.functional.communityPlatform.member.orders.tax_calculations.at(
      memberConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(taxCalculations);
  // Step 9: Validate tax calculation details
  TestValidator.equals(
    "tax region matches billing address jurisdiction",
    taxCalculations.taxRegion,
    "US-CA",
  );
  TestValidator.equals(
    "tax rate matches expected rate",
    taxCalculations.taxRate,
    0.085,
  );
  TestValidator.equals(
    "taxable amount matches product price",
    taxCalculations.taxableAmount,
    199.99,
  );
  TestValidator.equals(
    "tax amount correct calculation",
    taxCalculations.taxAmount,
    199.99 * 0.085,
  );
  TestValidator.equals(
    "tax reporting category matches product category",
    taxCalculations.taxReportingCategory,
    "standard",
  );
  TestValidator.equals(
    "no tax exemptions applied",
    taxCalculations.taxExemptions.length,
    0,
  );
}