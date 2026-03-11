import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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

export async function test_api_customer_refund_request_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the system
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>()
      ),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Generate order item ID for refund request
  // (in a real scenario, this would come from an actual order)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create refund request
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 4. Retrieve refund request
  const retrievedRequest =
    await api.functional.ecommerceMall.customer.refund_requests.at(
      customerConnection,
      { refundRequestId: refundRequest.id },
    );
  typia.assert(retrievedRequest);
  // 5. Validate response structure
  TestValidator.equals(
    "refund request ID matches",
    retrievedRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "reason matches input",
    retrievedRequest.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "status is pending",
    retrievedRequest.request_status,
    "pending",
  );
  TestValidator.notEquals(
    "time_limit is set",
    retrievedRequest.time_limit,
    null,
  );
  TestValidator.equals(
    "order item ID matches",
    retrievedRequest.order_item.id,
    orderItemId,
  );
  TestValidator.notEquals(
    "order item has product snapshot",
    retrievedRequest.order_item.product_snapshot,
    null,
  );
  TestValidator.notEquals(
    "order item has variant snapshot",
    retrievedRequest.order_item.variant_snapshot,
    null,
  );
  TestValidator.notEquals(
    "order item has seller profile snapshot",
    retrievedRequest.order_item.seller_profile_snapshot,
    null,
  );
  TestValidator.notEquals(
    "order item has id",
    retrievedRequest.order_item.id,
    null,
  );
  // 6. Validate timestamps (ISO 8601 format - validated by typia.assert)
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(retrievedRequest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(retrievedRequest.updated_at)),
  );
}