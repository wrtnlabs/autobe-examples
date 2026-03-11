import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
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

export async function test_api_customer_cancellation_request_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and login
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: customerPassword,
      href: "https://test.example.com",
      referrer: "https://test.example.com/join",
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as string,
    },
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
      href: "https://test.example.com",
      referrer: "https://test.example.com/login",
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as string,
    },
  });
  // 2. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.example.com",
      referrer: "https://test.example.com/join",
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as string,
    },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 3. Customer creates cancellation request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const createBody = {
    order_item_id: orderItemId,
    reason: reason,
  } satisfies IEcommerceMallCancellationRequest.ICreate;
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerLoginConnection,
      {
        body: createBody,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Customer retrieves the cancellation request
  const requestId: string & tags.Format<"uuid"> = cancellationRequest.id;
  const retrievedRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.at(
      customerLoginConnection,
      { cancellationRequestId: requestId },
    );
  typia.assert(retrievedRequest);
  // 5. Validate response
  TestValidator.equals(
    "cancellation request id",
    retrievedRequest.id,
    requestId,
  );
  TestValidator.equals("reason preserved", retrievedRequest.reason, reason);
  TestValidator.equals(
    "customer id matches",
    retrievedRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "order item id matches",
    retrievedRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "original reason text preserved",
    retrievedRequest.reason,
    createBody.reason,
  );
  TestValidator.predicate(
    "has valid timestamps",
    !!retrievedRequest.createdAt && !!retrievedRequest.updatedAt,
  );
  TestValidator.equals(
    "order item status",
    retrievedRequest.orderItem.item_status,
    "paid",
  );
  TestValidator.notEquals(
    "request has customer reference",
    retrievedRequest.customer,
    null,
  );
  TestValidator.notEquals(
    "request has order item reference",
    retrievedRequest.orderItem,
    null,
  );
}