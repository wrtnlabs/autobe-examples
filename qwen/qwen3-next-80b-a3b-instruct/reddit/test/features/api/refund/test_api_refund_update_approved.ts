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
import type { ICommunityPlatformOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderRefund";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_cart_item } from "../../../prepare/prepare_random_community_platform_cart_item";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_order_refund } from "../../../prepare/prepare_random_community_platform_order_refund";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_carts_items_create } from "../../../generate/generate_random_community_platform_member_carts_items_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_member_orders_refunds_create } from "../../../generate/generate_random_community_platform_member_orders_refunds_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_refund_update_approved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authorize admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category for product classification
  const categoryRaw =
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
  const category: ICommunityPlatformProductCategory & { id: string } = categoryRaw satisfies ICommunityPlatformProductCategory as ICommunityPlatformProductCategory & { id: string };
  // Step 3: Create inventory supplier for product sourcing
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
          city: "San Francisco",
          state_province: "CA",
          country: "US",
          postal_code: "94105",
          website: "https://techsupplier.com",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001"],
          account_manager_name: "John Doe",
          account_manager_email: "john@techsupplier.com",
          account_manager_phone: "+1234567890",
          bank_account_details: "123456789",
          password: "SupplierPass123!",
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/admin",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 4: Create product with pricing and images
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: "EL-1001",
          title: "Premium Wireless Headphones",
          description:
            "High-quality wireless headphones with noise cancellation and 20-hour battery life.",
          category_id: category.id,
          prices: [
            {
              product_code: "EL-1001",
              currency_code: "USD",
              amount: 199.99,
              effective_from: new Date().toISOString(),
              price_type: "retail",
            },
          ],
          images: [
            {
              productCode: "EL-1001",
              name: "Headphones Front View",
              extension: "jpg",
              url: "https://example.com/images/headphones.jpg",
              is_primary: true,
              alt_text: "Premium wireless headphones with black finish",
              order: 1,
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 5: Authenticate as member and create cart
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 6: Create an empty cart for the member
  const cartRaw =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cartRaw);
  const cart: ICommunityPlatformCart & { id: string } = cartRaw satisfies ICommunityPlatformCart as ICommunityPlatformCart & { id: string };
  // Step 7: Add product to cart to build order
  const cartItem =
    await generate_random_community_platform_member_carts_items_create(
      memberConnection,
      {
        params: {
          cartId: cart.id,
        },
        body: {
          product_variant_id: product.id,
          quantity: 1,
        } satisfies ICommunityPlatformCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Step 8: Create order from cart with proper address and delivery details (all required)
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const deliveryWindowId = typia.random<string & tags.Format<"uuid">>();
  const carrierId = typia.random<string & tags.Format<"uuid">>();
  const orderRaw = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: cart.id,
        shipping_address_id: addressId,
        billing_address_id: addressId,
        delivery_window_id: deliveryWindowId,
        carrier_id: carrierId,
        shipping_method: "Standard Ground",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(orderRaw);
  const order: ICommunityPlatformOrder & { id: string } = orderRaw satisfies ICommunityPlatformOrder as ICommunityPlatformOrder & { id: string };
  // Step 9: Create refund request for the order
  const refundRaw =
    await generate_random_community_platform_member_orders_refunds_create(
      memberConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          amount: order.total_amount,
          reason: "Item defective",
        } satisfies ICommunityPlatformOrderRefund.ICreate,
      },
    );
  typia.assert(refundRaw);
  const refund: ICommunityPlatformOrderRefund & { id: string } = refundRaw satisfies ICommunityPlatformOrderRefund as ICommunityPlatformOrderRefund & { id: string };
  TestValidator.equals(
    "refund status should be pending",
    refund.status,
    "pending",
  );
  // Step 10: Update refund status to approved with proper values
  const updatedRefund =
    await api.functional.communityPlatform.member.orders.refunds.update(
      memberConnection,
      {
        orderId: order.id,
        refundId: refund.id,
        body: {
          status: "approved",
          amount: refund.amount,
          refundMethod: "original_payment",
          originalTransactionId: refund.originalTransactionId,
          receiptNumber: refund.receiptNumber,
          refundReasonCode: "defective_product",
          notes: "Approval processed by automated systems",
          metadata: JSON.stringify({ source: "system_auto" }),
        } satisfies ICommunityPlatformOrderRefund.IUpdate,
      },
    );
  typia.assert(updatedRefund);
  // Step 11: Validate refund update was successful
  TestValidator.equals(
    "refund status should now be approved",
    updatedRefund.status,
    "approved",
  );
  TestValidator.equals(
    "refund amount unchanged",
    updatedRefund.amount,
    refund.amount,
  );
  TestValidator.equals(
    "refund method unchanged",
    updatedRefund.refundMethod,
    "original_payment",
  );
  TestValidator.equals(
    "refund reason code unchanged",
    updatedRefund.refundReasonCode,
    "defective_product",
  );
  TestValidator.equals(
    "refund receipt number unchanged",
    updatedRefund.receiptNumber,
    refund.receiptNumber,
  );
  TestValidator.equals(
    "refund original transaction ID unchanged",
    updatedRefund.originalTransactionId,
    refund.originalTransactionId,
  );
  // Step 12: Validate that improper refund amount update is rejected (business logic validation)
  await TestValidator.error(
    "cannot approve refund exceeding original order total",
    async () => {
      await api.functional.communityPlatform.member.orders.refunds.update(
        memberConnection,
        {
          orderId: order.id,
          refundId: refund.id,
          body: {
            status: "approved",
            amount: order.total_amount + 10.0, // Exceeds original order total
            refundMethod: "original_payment",
            originalTransactionId: refund.originalTransactionId,
            receiptNumber: refund.receiptNumber,
            refundReasonCode: "defective_product",
            notes: "Try to exceed limit",
          } satisfies ICommunityPlatformOrderRefund.IUpdate,
        },
      );
    },
  );
}