import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

/**
 * Test authorization failure when a customer attempts to erase another customer's cancellation request.
 *
 * Business rule: Only the customer who originally submitted the cancellation request can erase it.
 *
 * Steps:
 * 1. Authenticate as Customer A (owner) and create a cancellation request
 * 2. Authenticate as Customer B (different customer)
 * 3. Attempt to erase Customer A's cancellation request with Customer B's credentials
 * 4. Verify the operation is rejected with 404 Not Found (to avoid information disclosure) or 403 Forbidden
 * 5. Confirm the cancellation request remains intact
 */
export async function test_api_cancellation_request_erase_rejected_cross_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Customer A (owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customerA);
  // 2. Create a cancellation request as Customer A
  const cancellationRequest: IEcommerceMallCancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerAConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // 3. Authenticate as Customer B (different customer)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customerB);
  // 4. Attempt to erase Customer A's cancellation request with Customer B's credentials
  // Should be rejected with 404 Not Found (to avoid information disclosure) or 403 Forbidden
  await TestValidator.error(
    "cross-customer cancellation request erase should be rejected",
    async () => {
      await api.functional.ecommerceMall.customer.cancellation_requests.erase(
        customerBConnection,
        {
          cancellationRequestId: cancellationRequest.id,
        },
      );
    },
  );
  // 5. Confirm the cancellation request still exists and is intact by having Customer A erase it
  // This verifies the request wasn't actually deleted by Customer B's unauthorized attempt
  await api.functional.ecommerceMall.customer.cancellation_requests.erase(
    customerAConnection,
    {
      cancellationRequestId: cancellationRequest.id,
    },
  );
}
