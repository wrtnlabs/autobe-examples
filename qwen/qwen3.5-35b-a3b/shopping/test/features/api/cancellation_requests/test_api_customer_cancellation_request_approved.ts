import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

export async function test_api_customer_cancellation_request_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup customer account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinResponse = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerJoinResponse);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerLoginResponse = await authorize_customer_login(
    customerConnection,
    {
      body: {
        email: customerJoinResponse.email,
        password: "password123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(customerLoginResponse);
  // 2. Setup seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoinResponse);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinResponse.email,
      password: "password123",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerJoinResponse);
  // 3. Customer creates cancellation request
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "request initially pending",
    cancellationRequest.status,
    "pending",
  );
  // 4. Seller approves the cancellation request
  const approvedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.approve(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // 5. Customer retrieves the approved cancellation request
  const retrievedRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate response
  TestValidator.equals(
    "request is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "seller reference exists",
    retrievedRequest.seller_id,
    cancellationRequest.seller_id,
  );
  TestValidator.equals(
    "order_item reference exists",
    retrievedRequest.order_item_id,
    cancellationRequest.order_item_id,
  );
  TestValidator.equals(
    "customer reference exists",
    retrievedRequest.customer.id,
    customerJoinResponse.id,
  );
}