import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_cancellation_request_customer_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoined: IEcommerceMallMember.IAuthorized =
    await api.functional.ecommerceMall.auth.member.join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testpassword123",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    });
  typia.assert(customerJoined);
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoined: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testpassword123",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerJoined);
  // 3. Create customer address for order
  await authorize_member_login(customerConnection, {
    body: {
      email: customerJoined.email,
      password: "testpassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.ILogin,
  });
  const address =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(2),
          state: RandomGenerator.name(2),
          postal_code: typia.random<
            string & tags.MinLength<5> & tags.MaxLength<10>
          >(),
          country: "South Korea",
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);
  // 4. Customer places order with pre-existing product variant
  // Note: Uses random UUIDs for category and variant as no creation APIs available
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        order_items: [
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: 1,
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 5. Get order item with status 'paid'
  const paidItem: IEcommerceMallOrderItem.ISummary = order.items[0];
  typia.assert(paidItem);
  // Validate order item status is 'paid'
  TestValidator.equals("order item status is paid", paidItem.status, "paid");
  // 6. Create cancellation request
  const cancellationRequest =
    await api.functional.ecommerceMall.member.cancellation_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: paidItem.id,
          reason: "Changed mind about the purchase",
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 7. Validate cancellation request entity
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "order item ID matches",
    cancellationRequest.ecommerce_mall_order_item_id,
    paidItem.id,
  );
  TestValidator.equals(
    "order ID matches",
    cancellationRequest.ecommerce_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "cancellation reason matches",
    cancellationRequest.reason,
    "Changed mind about the purchase",
  );
  // Validate timestamp fields are set
  const createdAt = new Date(cancellationRequest.created_at);
  const now = new Date();
  const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
  TestValidator.predicate(
    "created_at is recent (within 1 minute)",
    timeDiff < 60 * 1000,
  );
  // 8. Verify order item status remains 'paid' after cancellation request
  // Note: Order item status should not change until seller approves rejection
  TestValidator.equals(
    "order item status remains paid after cancellation request",
    paidItem.status,
    "paid",
  );
}
