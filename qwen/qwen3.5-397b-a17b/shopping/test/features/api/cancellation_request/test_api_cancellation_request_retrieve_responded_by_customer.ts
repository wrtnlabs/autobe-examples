import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_cancellation_request_retrieve_responded_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create an order with PAID order items
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order has items and they are in PAID status
  TestValidator.predicate("order has items", () => order.items.length > 0);
  const orderItem = order.items[0];
  TestValidator.equals("order item status is PAID", orderItem.status, "PAID");
  // 3. Customer submits cancellation request for the order item
  const cancellationReason = "Customer changed mind about this purchase";
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: cancellationReason,
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial cancellation request state
  TestValidator.equals(
    "cancellation request status is PENDING",
    cancellationRequest.status,
    "PENDING",
  );
  TestValidator.equals(
    "reason matches submission",
    cancellationRequest.reason,
    cancellationReason,
  );
  TestValidator.predicate(
    "responded_at is null initially",
    () => cancellationRequest.responded_at === null,
  );
  TestValidator.equals(
    "respondedSeller is null initially",
    cancellationRequest.respondedSeller,
    null,
  );
  // 4. Seller authentication - create seller and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Seller1234!";
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 5. Seller responds to the cancellation request (approve it)
  const responseTime = new Date().toISOString();
  const respondedCancellationRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "APPROVED",
          responded_at: responseTime,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(respondedCancellationRequest);
  // 6. Customer retrieves the responded cancellation request
  const retrievedRequest =
    await api.functional.shoppingMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate the responded cancellation request details
  TestValidator.predicate(
    "status is APPROVED or REJECTED",
    () =>
      retrievedRequest.status === "APPROVED" ||
      retrievedRequest.status === "REJECTED",
  );
  TestValidator.predicate(
    "responded_at is populated",
    () => retrievedRequest.responded_at !== null,
  );
  TestValidator.predicate(
    "respondedSeller exists",
    () => retrievedRequest.respondedSeller !== null,
  );
  TestValidator.equals(
    "reason matches original",
    retrievedRequest.reason,
    cancellationReason,
  );
  TestValidator.predicate(
    "requested_at is earlier than responded_at",
    () =>
      new Date(retrievedRequest.requested_at).getTime() <
      new Date(retrievedRequest.responded_at!).getTime(),
  );
  // Validate respondedSeller contains required information
  if (retrievedRequest.respondedSeller !== null) {
    TestValidator.predicate(
      "seller has id",
      () => retrievedRequest.respondedSeller!.id !== undefined,
    );
    TestValidator.predicate(
      "seller has shop_name",
      () => retrievedRequest.respondedSeller!.shop_name !== undefined,
    );
    TestValidator.predicate(
      "seller has email",
      () => retrievedRequest.respondedSeller!.email !== undefined,
    );
  }
  // Validate orderItem status reflects cancellation outcome (CANCELLED if approved)
  if (retrievedRequest.status === "APPROVED") {
    TestValidator.equals(
      "order item status is CANCELLED",
      retrievedRequest.orderItem.status,
      "CANCELLED",
    );
  }
}
