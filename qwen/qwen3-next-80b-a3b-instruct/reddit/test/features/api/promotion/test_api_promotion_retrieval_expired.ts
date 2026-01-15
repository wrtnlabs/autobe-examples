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
export async function test_api_promotion_retrieval_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a member connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/member/join",
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
          description: RandomGenerator.content(),
          status: "active",
          parent_id: null,
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
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
          address_line_1: RandomGenerator.paragraph({ sentences: 2 }),
          city: "Seoul",
          state_province: "Seoul",
          country: "KR",
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 500000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "1234567890",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/hub",
          postal_code: "06167",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 5: Create a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: (typia.assert(category) as any).id,
          prices: [
            {
              product_code: productCode,
              currency_code: "KRW",
              amount: 10000,
              effective_from: new Date().toISOString(),
              effective_to: new Date(Date.now() + 86400000 * 30).toISOString(),
            },
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Create a cart
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Step 7: Create shipment with package (corrected)
  // Create raw package data
  const packageData: ICommunityPlatformShipmentPackage.ICreate = {
    shipment_id: "", // Placeholder, will be updated
    product_id: product.id,
    quantity: 1,
    weight_grams: 500,
    tracking_number: RandomGenerator.alphaNumeric(14),
    carrier_id: "default-carrier-id",
    insurance_value_usd: 100,
    special_instructions: "Handle with care",
  };
  // Create shipment with package
  const shipment: ICommunityPlatformShipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          packages: [packageData],
          shipment_type: "standard",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Update package data with actual shipment_id after creation
  packageData.shipment_id = shipment.id;
  // Step 8: Create a shipping address
  const shippingAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        body: {
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: "Seoul",
          state_province: "Seoul",
          postal_code: "06167",
          country: "KR",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  typia.assert(shippingAddress);
  // Step 9: Create an order from cart
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: (typia.assert(cart) as any).id,
        shipping_address_id: shippingAddress.id,
        billing_address_id: shippingAddress.id,
        delivery_window_id: "default-window-id",
        carrier_id: "default-carrier-id",
        shipping_method: "standard",
        currency_code: "KRW",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 10: Apply a pre-existing expired promotion to the order
  // Since there's no API to create promotions, we assume a pre-existing expired promotion exists
  const expiredPromotionCode = "TEST-EXPIRED-PROMO-001";
  // Apply the promotion to the order
  await api.functional.communityPlatform.member.orders.promotions.applyPromotions(
    memberConnection,
    {
      orderId: order.id,
      body: {
        codes: [expiredPromotionCode],
      } satisfies ICommunityPlatformOrderPromotion.IRequest,
    },
  );
  // Wait a moment to ensure consistent timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 11: Retrieve promotion details for the expired promotion
  const retrievedPromotion =
    await api.functional.communityPlatform.admin.orders.promotions.at(
      adminConnection,
      {
        orderId: order.id,
        promotionCode: expiredPromotionCode,
      },
    );
  typia.assert(retrievedPromotion);
  // Step 12: Validate that the promotion is expired
  // We assume this promotion is in fact expired based on the test scenario
  // The promotion was pre-configured to be expired
  const retrievedExpiredDate = new Date(retrievedPromotion.activeEndDate);
  const now = new Date();
  TestValidator.equals(
    "promotion should be expired",
    retrievedPromotion.isActive,
    false,
  );
  TestValidator.predicate(
    "activeEndDate should be before current time",
    retrievedExpiredDate < now,
  );
  TestValidator.equals(
    "promotion code matches",
    retrievedPromotion.code,
    expiredPromotionCode,
  );
  TestValidator.equals(
    "promotion targetId matches",
    retrievedPromotion.targetId,
    product.id,
  );
}
