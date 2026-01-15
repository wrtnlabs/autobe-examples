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
import type { ICommunityPlatformOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderPayment";
import type { ICommunityPlatformOrderPaymentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderPaymentMetadata";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_order_payment } from "../../../prepare/prepare_random_community_platform_order_payment";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_member_orders_payments_create } from "../../../generate/generate_random_community_platform_member_orders_payments_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_retrieval_by_admin(
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
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create product category for product
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
  // Use a UUID for category_id since ICommunityPlatformProductCategory doesn't have id
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create inventory supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph({
            sentences: 1,
            wordMax: 8,
          }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          country: "US",
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/join",
          referrer: "https://example.com",
          postal_code: "90210",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 5: Create product for order
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
    category_id: categoryId, // Use random UUID instead of non-existent id property
    prices: [
      {
        product_code: "", // Placeholder - will be set after product creation
        currency_code: "USD",
        amount: typia.random<number & tags.Minimum<0>>(),
        effective_from: new Date().toISOString(),
      } satisfies ICommunityPlatformProductPrice.ICreate,
    ],
    images: [] satisfies ICommunityPlatformProductImage.ICreate[],
  };
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: productCreateBody,
      },
    );
  // Update product code in prices after product creation
  productCreateBody.prices[0].product_code = product.productCode;
  // Create product with corrected prices
  const productWithCorrectedPrice =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: productCreateBody,
      },
    );
  // Step 6: Create cart for member
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  // Use a random UUID for cartId since ICommunityPlatformCart doesn't have id
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // Step 7: Create order by member
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();
  const deliveryWindowId = typia.random<string & tags.Format<"uuid">>();
  const carrierId = typia.random<string & tags.Format<"uuid">>();
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: cartId, // Use random UUID instead of non-existent id property
        shipping_address_id: shippingAddressId,
        billing_address_id: billingAddressId,
        delivery_window_id: deliveryWindowId,
        carrier_id: carrierId,
        shipping_method: "Standard Ground",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 8: Create payment record associated with order
  const metadataString = `payment_${RandomGenerator.alphaNumeric(16)}`;
  const payment =
    await generate_random_community_platform_member_orders_payments_create(
      memberConnection,
      {
        body: {
          amount: order.total_amount,
          method: "credit_card",
          currency: "USD",
          metadata: metadataString, // Correctly uses string type
        } satisfies ICommunityPlatformOrderPayment.ICreate,
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(payment);
  // Step 9: Retrieve payment details as admin (test admin access)
  const retrievedPayment: ICommunityPlatformOrderPayment =
    await api.functional.communityPlatform.member.orders.payments.at(
      adminConnection,
      {
        orderId: order.id,
        paymentId: payment.id,
      },
    );
  typia.assert(retrievedPayment);
  // Step 10: Validate that payment details match expected values
  TestValidator.equals(
    "payment amount matches",
    retrievedPayment.amount,
    payment.amount,
  );
  TestValidator.equals(
    "payment currency matches",
    retrievedPayment.currency,
    payment.currency,
  );
  TestValidator.equals(
    "payment method matches",
    retrievedPayment.payment_method,
    payment.payment_method,
  );
  TestValidator.equals(
    "payment status matches",
    retrievedPayment.payment_status,
    payment.payment_status,
  );
  TestValidator.equals(
    "order id matches",
    retrievedPayment.order_id,
    payment.order_id,
  );
  TestValidator.equals(
    "member id matches",
    retrievedPayment.member_id,
    payment.member_id,
  );
  TestValidator.equals(
    "created at matches",
    retrievedPayment.created_at,
    payment.created_at,
  );
  // Validate metadata
  TestValidator.equals(
    "metadata matches",
    retrievedPayment.metadata,
    payment.metadata,
  );
  // Validate that admin can access payment regardless of ownership
  // The test ensures adminConnection can access payment even though it was created by memberConnection
}
