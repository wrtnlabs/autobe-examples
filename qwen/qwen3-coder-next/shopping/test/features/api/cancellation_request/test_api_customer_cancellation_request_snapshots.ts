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

export async function test_api_customer_cancellation_request_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<
          string & tags.MinLength<1> & tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<
          string & tags.MinLength<1> & tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 3. Seller login
  await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.email,
      password: "password",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Customer login
  await authorize_customer_login(customerConnection, {
    body: {
      email: customer.customer.email,
      password: "password",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 5. Create cancellation request
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "pending" as const,
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          customer_id: customer.customer.id,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 6. Seller approves the cancellation request
  await api.functional.ecommerceMall.seller.orders.items.cancel.approve.approveCancellation(
    sellerConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      orderItemId: cancellationRequest.orderItem.id,
    },
  );
  // 7. Customer retrieves cancellation request snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(snapshotsResponse);
  // 8. Validate snapshots
  const snapshots = snapshotsResponse.value as any as Array<{
    reason: string;
    status: string;
    responded_at: string | null;
  }>;
  TestValidator.equals("at least 2 snapshots", snapshots.length >= 2, true);
  TestValidator.equals(
    "first snapshot reason matches request",
    snapshots[0].reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "first snapshot status is pending",
    snapshots[0].status,
    "pending",
  );
  TestValidator.equals(
    "second snapshot status is approved",
    snapshots[1].status,
    "approved",
  );
  TestValidator.predicate(
    "second snapshot has responded_at",
    snapshots[1].responded_at !== null &&
      snapshots[1].responded_at !== undefined,
  );
}
