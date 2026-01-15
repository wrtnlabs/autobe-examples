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
import type { ICommunityPlatformOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderRefund";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_order_refund } from "../../../prepare/prepare_random_community_platform_order_refund";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_member_orders_refunds_create } from "../../../generate/generate_random_community_platform_member_orders_refunds_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_refund_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberJoinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: "password123",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 3: Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Extract category_id from response even though interface doesn't show it
  // API returns an object with id property
  const categoryId: string = (category as any).id as string;
  // Step 4: Register inventory supplier
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
          bank_account_details: "123456789",
          password: "supplier123",
          postal_code: "10001",
          href: "https://example.com/supplier/join",
          referrer: "https://example.com/home",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Extract supplier id from response
  const supplierId: string = (supplier as any).id as string;
  // Step 5: Create product
  const price = {
    product_code: "prod-123",
    currency_code: "USD",
    amount: 100,
    effective_from: new Date().toISOString(),
  } satisfies ICommunityPlatformProductPrice.ICreate;
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: "prod-123",
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [price],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 6: Create cart
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Extract cart id from response
  const cartId: string = (cart as any).id as string;
  // Step 7: Create order
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: cartId,
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        billing_address_id: typia.random<string & tags.Format<"uuid">>(),
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: "Standard Ground",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  const orderId: string = order.id as string;
  const orderTotalAmount: number = order.total_amount as number;
  // Step 8: Initiate refund request
  const refundRequest =
    await generate_random_community_platform_member_orders_refunds_create(
      memberConnection,
      {
        params: { orderId: orderId },
        body: {
          amount: orderTotalAmount * 0.5,
          reason: RandomGenerator.name(),
        } satisfies ICommunityPlatformOrderRefund.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Extract refund id from response
  const refundId: string = (refundRequest as any).id as string;
  // Step 9: Retrieve refund record
  const refund = await api.functional.communityPlatform.admin.orders.refunds.at(
    adminConnection,
    {
      orderId: orderId,
      refundId: refundId,
    },
  );
  typia.assert(refund);
  // Step 10: Validate refund details - only fields that exist in ICommunityPlatformOrderRefund
  TestValidator.equals("refund status", refund.status, "pending");
  TestValidator.equals("refund amount", refund.amount, refundRequest.amount);
  TestValidator.equals(
    "refund reason code",
    refund.refundReasonCode,
    "customer_unsatisfied",
  );
  TestValidator.equals(
    "refund method",
    refund.refundMethod,
    "original_payment",
  );
  TestValidator.notEquals(
    "original transaction id",
    refund.originalTransactionId,
    null,
  );
  TestValidator.notEquals("receipt number", refund.receiptNumber, null);
}
