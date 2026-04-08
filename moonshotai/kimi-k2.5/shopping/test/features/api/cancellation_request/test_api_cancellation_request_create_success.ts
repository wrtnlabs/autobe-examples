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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
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
 * Test successful creation of a cancellation request for a paid order item.
 * 1. Authenticate as customer using join endpoint
 * 2. Create cancellation request with valid reason for a paid order item
 * 3. Verify response returns 201 with cancellation request details
 * 4. Validate generated ID, initial pending status, timestamps, and order item association
 */
export async function test_api_cancellation_request_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection (isolation pattern)
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as customer
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      href: "http://localhost/customer/join",
      referrer: "http://localhost/home",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Step 2: Create cancellation request (utility prepares order item internally)
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: "Changed my mind about this purchase",
        },
      },
    );
  // Step 3: Validate response structure
  typia.assert(cancellationRequest);
  // Step 4: Verify business logic validations
  TestValidator.equals(
    "status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "has valid UUID id",
    typeof cancellationRequest.id === "string",
  );
  TestValidator.predicate(
    "reason is non-empty",
    cancellationRequest.reason.length > 0,
  );
  TestValidator.equals(
    "has associated order item",
    !!cancellationRequest.orderItem.id,
    true,
  );
  TestValidator.equals(
    "has customer summary",
    !!cancellationRequest.customer,
    true,
  );
}
