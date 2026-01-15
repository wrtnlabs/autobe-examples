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
export async function test_api_payment_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 3: Create category via admin
  const category: ICommunityPlatformProductCategory =
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
  // Step 4: Create inventory supplier via admin
  const supplier: ICommunityPlatformInventorySuppliers =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: "123 Main St",
          city: "Seoul",
          state_province: "Seoul",
          country: "KR",
          postal_code: "06136",
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
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 5: Create product via member
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: (category as any).id satisfies string as string, // Cast to any to access id
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "KRW",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
              quantity_max: 100,
            },
          ] satisfies ICommunityPlatformProduct.ICreate["prices"],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Create cart via member
  const cart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Step 7: Create order via member (using cart and member-specific connection)
  const order: ICommunityPlatformOrder =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: (cart as any).id satisfies string as string, // Cast to any to access id
          shipping_address_id: "11111111-1111-1111-1111-111111111111",
          billing_address_id: "22222222-2222-2222-2222-222222222222",
          delivery_window_id: "33333333-3333-3333-3333-333333333333",
          carrier_id: "44444444-4444-4444-4444-444444444444",
          shipping_method: "Standard Ground",
          currency_code: "KRW",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  // Step 8: Create payment for order via member
  const payment: ICommunityPlatformOrderPayment =
    await generate_random_community_platform_member_orders_payments_create(
      memberConnection,
      {
        body: {
          amount: order.total_amount,
          method: "credit_card",
          currency: order.currency_code,
          metadata: undefined, // Changed from null to undefined to match schema requirement 'string | undefined'
        } satisfies ICommunityPlatformOrderPayment.ICreate,
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(payment);
  // Step 9: Retrieve payment with member connection - this should succeed
  const retrievedPayment: ICommunityPlatformOrderPayment =
    await api.functional.communityPlatform.member.orders.payments.at(
      memberConnection,
      {
        orderId: order.id,
        paymentId: payment.id,
      },
    );
  typia.assert(retrievedPayment);
  // Step 10: Validate retrieved payment matches created payment
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
    "payment status matches",
    retrievedPayment.payment_status,
    payment.payment_status,
  );
  TestValidator.equals(
    "payment method matches",
    retrievedPayment.payment_method,
    payment.payment_method,
  );
  TestValidator.equals(
    "payment order_id matches",
    retrievedPayment.order_id,
    payment.order_id,
  );
  // Step 11: Create second member connection for testing access control
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(anotherMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(anotherMember);
  // Step 12: Attempt to retrieve payment with another member connection - this should fail
  await TestValidator.error(
    "unauthorized member cannot access payment",
    async () => {
      await api.functional.communityPlatform.member.orders.payments.at(
        anotherMemberConnection,
        {
          orderId: order.id,
          paymentId: payment.id,
        },
      );
    },
  );
}