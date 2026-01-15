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
import type { ICommunityPlatformOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderShipment";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentInsurance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentInsurance";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import type { ICommunityPlatformShipmentStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentStatusBreakdown";
import type { ICommunityPlatformShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformOrderShipment";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_member_orders_shipments_create } from "../../../generate/generate_random_community_platform_member_orders_shipments_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_shipments_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin to create category and supplier
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          status: "active",
          parent_id: null,
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 3: Create inventory supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.name(),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          country: "US",
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 10000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "0123456789",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/admin",
          postal_code: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 4: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 5: Create product with correct category_id
  const category_id = "cat-" + typia.random<string & tags.Format<"uuid">>(); // Generate a UUID-like id
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: category_id, // Use the generated UUID as category_id
          prices: [
            {
              product_code:
                "prod-" + typia.random<string & tags.Format<"uuid">>(), // Use UUID for product_code
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
              quantity_max: null,
              notes: "Launch price",
              source: "ManualEntry",
              region: "North America",
              price_type: "retail",
              tax_rate: 0.08,
              unit: "per item",
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 6: Create shopping cart
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Since the cart object doesn't have an id property in the provided DTO,
  // but the order creation requires a cartId, we'll generate a UUID for the cartId
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // Step 7: Create order from cart using generated cartId
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: cartId,
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        billing_address_id: typia.random<string & tags.Format<"uuid">>(),
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: "standard",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  // Step 8: Create shipment for order
  const shipment =
    await api.functional.communityPlatform.member.orders.shipments.create(
      memberConnection,
      {
        orderId: order.id,
        body: {
          notes: "Handle with care",
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: product.id,
              quantity: 1,
              weight_grams: 500,
              tracking_number: RandomGenerator.alphaNumeric(15),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 100,
              special_instructions: "Do not stack",
            },
          ],
          shipment_type: "standard",
          exception_handling: "redeliver",
          signature_required: true,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // Step 9: Retrieve shipments using correct IRequest schema
  const response =
    await api.functional.communityPlatform.orders.shipments.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          search: shipment.trackingNumber, // Use camelCase as it exists in the shipment object
          carrier_id: shipment.carrierId, // Use camelCase as it exists in the shipment object
          created_after: order.created_at, // Using order's created_at
          created_before: new Date(Date.now() + 86400000).toISOString(),
          sort_by: "created_at", // Use created_at as sort_by
          order: "desc",
        } satisfies ICommunityPlatformOrderShipment.IRequest,
      },
    );
  // Step 10: Validate response
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "at least one shipment returned",
    response.data.length > 0,
  );
  // Validate shipment details from the response objects
  const retrievedShipment = response.data[0];
  // Use the exact property names from ICommunityPlatformOrderShipment (snake_case)
  TestValidator.equals(
    "shipment ownership matches order",
    retrievedShipment.order_id,
    order.id,
  );
  TestValidator.equals(
    "shipment tracking number matches",
    retrievedShipment.tracking_number,
    shipment.trackingNumber,
  );
  TestValidator.equals(
    "shipment carrier matches",
    retrievedShipment.carrier_id,
    shipment.carrierId,
  );
  // Validate delivery status by checking that status_id is not null
  TestValidator.predicate(
    "shipment has valid delivery status",
    retrievedShipment.status_id !== undefined &&
      retrievedShipment.status_id !== null,
  );
  // Validate estimated delivery date
  TestValidator.predicate(
    "shipment has estimated delivery date",
    retrievedShipment.estimated_delivery_at !== undefined &&
      retrievedShipment.estimated_delivery_at !== null,
  );
  // Validate pagination info
  TestValidator.predicate(
    "pagination pages correct",
    response.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    response.pagination.records >= response.data.length,
  );
}
