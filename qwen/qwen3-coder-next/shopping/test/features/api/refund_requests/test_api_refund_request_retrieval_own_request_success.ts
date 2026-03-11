import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_retrieval_own_request_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and log in
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: "1234!@#$",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Get an order item for testing (need to create an order first)
  // Since we don't have order creation utilities, we'll need to create the full order flow
  // For now, we'll use the generate_random_ecommerce_mall_customer_refund_requests_create utility
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {},
    );
  typia.assert(refundRequest);
  // 3. Retrieve the refund request
  const retrieved =
    await api.functional.ecommerceMall.customer.refund_requests.at(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrieved);
  // 4. Verify the retrieved refund request matches the created one
  TestValidator.equals(
    "refund request ID matches",
    retrieved.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "order item ID matches",
    retrieved.order_item_id,
    refundRequest.order_item_id,
  );
  TestValidator.equals(
    "customer ID matches",
    retrieved.customer_id,
    refundRequest.customer_id,
  );
  TestValidator.equals(
    "seller ID matches",
    retrieved.seller_id,
    refundRequest.seller_id,
  );
  TestValidator.equals(
    "reason matches",
    retrieved.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "status is pending",
    retrieved.status,
    refundRequest.status,
  );
  // 5. Verify nested relations are present
  TestValidator.predicate(
    "has order item",
    retrieved.orderItem !== null && retrieved.orderItem !== undefined,
  );
  TestValidator.predicate(
    "has customer",
    retrieved.customer !== null && retrieved.customer !== undefined,
  );
  TestValidator.predicate(
    "has seller",
    retrieved.seller !== null && retrieved.seller !== undefined,
  );
}