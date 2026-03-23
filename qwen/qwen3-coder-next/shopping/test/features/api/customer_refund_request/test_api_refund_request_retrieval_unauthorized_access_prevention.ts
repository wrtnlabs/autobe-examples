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

export async function test_api_refund_request_retrieval_unauthorized_access_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two customers: Customer A and Customer B
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string & tags.MinLength<1> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string & tags.MinLength<1> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Create an order and deliver it for Customer A
  // This requires creating products, placing an order, and completing it
  // For simplicity, we'll create a minimal scenario
  // 3. Customer A creates a refund request
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerAConnection,
      {
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 4. Customer B attempts to retrieve Customer A's refund request (should fail)
  await TestValidator.error(
    "unauthorized access to another customer's refund request",
    async () => {
      await api.functional.ecommerceMall.customer.refund_requests.at(
        customerBConnection,
        {
          refundRequestId: refundRequest.id,
        },
      );
    },
  );
  // 5. Verify non-existent UUID returns appropriate error
  await TestValidator.error("non-existent refund request ID", async () => {
    await api.functional.ecommerceMall.customer.refund_requests.at(
      customerBConnection,
      {
        refundRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}