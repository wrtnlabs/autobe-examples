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
import type { ICommunityPlatformOrderPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderPromotion";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_specification } from "../../../prepare/prepare_random_community_platform_product_specification";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_shipment_address } from "../../../prepare/prepare_random_community_platform_shipment_address";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_products_specifications_create } from "../../../generate/generate_random_community_platform_member_products_specifications_create";
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
export async function test_api_promotion_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to create resources
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create a product category
  const category =
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
  typia.assert(category);
  // Step 4: Create an inventory supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph(),
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
          bank_account_details: "1234567890",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/join",
          referrer: "https://example.com",
          postal_code: typia.random<string & tags.Pattern<"^\\d{5}$">>(),
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 5: Create a product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: (category as any).id,
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: typia.random<
                number & tags.Minimum<1>
              >() satisfies number as number,
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 0,
              quantity_max: null,
              notes: "",
              source: "ManualEntry",
              region: "",
              price_type: "retail",
              tax_rate: 0,
              unit: "",
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Create product specifications
  const specification =
    await generate_random_community_platform_member_products_specifications_create(
      memberConnection,
      {
        params: { productCode: product.productCode },
        body: {
          key: "color",
          value: "black",
        } satisfies ICommunityPlatformProductSpecification.ICreate,
      },
    );
  typia.assert(specification);
  // Step 7: Create a cart
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Step 8: Create a shipping address
  const shippingAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        params: { shipmentId: "123e4567-e89b-12d3-a456-426614174000" },
        body: {
          street_address: RandomGenerator.paragraph(),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: typia.random<string & tags.Pattern<"^\\d{5}$">>(),
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
      },
    );
  typia.assert(shippingAddress);
  // Step 9: Create a billing address
  const billingAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        params: { shipmentId: "123e4567-e89b-12d3-a456-426614174000" },
        body: {
          street_address: RandomGenerator.paragraph(),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: typia.random<string & tags.Pattern<"^\\d{5}$">>(),
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
      },
    );
  typia.assert(billingAddress);
  // Step 10: Create order from the cart using known UUIDs for delivery_window_id and carrier_id (pre-configured in test environment)
  const deliveryWindowId = "123e4567-e89b-12d3-a456-426614174000";
  const carrierId = "123e4567-e89b-12d3-a456-426614174000";
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: (cart as any).id,
        shipping_address_id: shippingAddress.id,
        billing_address_id: billingAddress.id,
        delivery_window_id: deliveryWindowId,
        carrier_id: carrierId,
        shipping_method: "standard",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 11: Apply promotion code to the order
  // Since no API exists to create promotion, we use a known static promotion code from test environment
  const promotionCode = "WELCOME10";
  await api.functional.communityPlatform.member.orders.promotions.applyPromotions(
    memberConnection,
    {
      orderId: order.id,
      body: {
        codes: [promotionCode],
      } satisfies ICommunityPlatformOrderPromotion.IRequest,
    },
  );
  // Step 12: Retrieve promotion details by admin
  const retrievedPromotion =
    await api.functional.communityPlatform.admin.orders.promotions.at(
      adminConnection,
      {
        orderId: order.id,
        promotionCode,
      },
    );
  typia.assert(retrievedPromotion);
  // Step 13: Validate promotion details
  TestValidator.equals(
    "promotion code matches",
    retrievedPromotion.code,
    promotionCode,
  );
  TestValidator.predicate("promotion is active", retrievedPromotion.isActive);
  TestValidator.equals(
    "discount type is percentage",
    retrievedPromotion.discountType,
    "percentage",
  );
  TestValidator.predicate(
    "discount value is positive",
    retrievedPromotion.discountValue > 0,
  );
  TestValidator.predicate(
    "active start date is in past",
    new Date(retrievedPromotion.activeStartDate) <= new Date(),
  );
  TestValidator.predicate(
    "active end date is in future",
    new Date(retrievedPromotion.activeEndDate) >= new Date(),
  );
  TestValidator.predicate(
    "max uses is greater than or equal to current uses",
    retrievedPromotion.maxUses >= retrievedPromotion.currentUses,
  );
}
