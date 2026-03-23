import api from "@ORGANIZATION/PROJECT-api";
import type { IArrayIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IArrayIEcommerceMallCancellationRequestSnapshot";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_customer_cancellation_request_snapshots_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account via /auth/customer/join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://example.com/registration",
    referrer: "https://example.com/referral",
    ip: "127.0.0.1",
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerJoined = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  typia.assert(customerJoined);
  // 2. Create seller account via /auth/seller/join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: `Test Shop ${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerJoined = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerJoined);
  // 3. Log in as customer to get authentication
  const customerLoginInput = {
    email: customerJoinInput.email,
    password: customerJoinInput.password,
    href: "https://example.com/login",
    referrer: "https://example.com/",
    ip: "127.0.0.1",
  } satisfies IEcommerceMallCustomer.ILogin;
  const customerLoggedIn = await authorize_customer_login(customerConnection, {
    body: customerLoginInput,
  });
  typia.assert(customerLoggedIn);
  // 4. Log in as seller to get authentication
  const sellerLoginInput = {
    email: sellerJoinInput.email,
    password: sellerJoinInput.password,
  } satisfies IEcommerceMallSeller.ILogin;
  const sellerLoggedIn = await authorize_seller_login(sellerConnection, {
    body: sellerLoginInput,
  });
  typia.assert(sellerLoggedIn);
  // 5. Generate mock order item data using typia.random
  const orderItem = typia.random<IEcommerceMallOrderItem.ISummary>();
  // 6. Create a cancellation request for the order item
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          status: "pending" as const,
          order_item_id: orderItem.id,
          seller_id: orderItem.seller.id,
          customer_id: customerJoined.customer.id,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 7. Seller rejects the cancellation request
  const rejection =
    await api.functional.ecommerceMall.seller.orders.items.cancel.reject(
      sellerConnection,
      {
        orderId: orderItem.id,
        orderItemId: orderItem.id,
        body: {
          reason: "Product is already shipped",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejection);
  // 8. Customer retrieves snapshots for the cancellation request
  const snapshots =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(snapshots);
  // 9. Validate snapshots
  TestValidator.equals(
    "snapshot count is at least two",
    snapshots.value.length >= 2,
    true,
  );
  if (snapshots.value.length >= 2) {
    const rejectionSnapshot = snapshots.value[1];
    TestValidator.equals(
      "second snapshot has rejection status",
      (rejectionSnapshot as any).status,
      "rejected",
    );
    TestValidator.predicate(
      "second snapshot has responded_at",
      () => (rejectionSnapshot as any).responded_at !== null,
    );
    TestValidator.equals(
      "second snapshot preserves original reason",
      (rejectionSnapshot as any).reason,
      "Product is already shipped",
    );
  }
  TestValidator.equals(
    "order item status remains paid",
    orderItem.item_status,
    "paid",
  );
}
