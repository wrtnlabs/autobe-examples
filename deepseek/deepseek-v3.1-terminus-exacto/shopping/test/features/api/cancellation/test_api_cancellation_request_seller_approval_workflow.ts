import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

export async function test_api_cancellation_request_seller_approval_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create cancellation request using utility function
  const cancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // 3. Create seller connection (authentication would normally happen here)
  const sellerConnection: api.IConnection = { host: connection.host };
  // 4. Generate valid approval reason that meets 10-500 character requirement
  const approvalReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  TestValidator.predicate(
    "approval reason meets length requirement",
    approvalReason.length >= 10 && approvalReason.length <= 500,
  );
  // 5. Seller approves the cancellation request
  const approvalResponse =
    await api.functional.ecommerce.customer.cancellation_requests.responses.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          decision: "approved",
          reason: approvalReason,
        } satisfies IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvalResponse);
  // 6. Validate approval response structure
  TestValidator.equals(
    "cancellation request ID preserved",
    approvalResponse.id,
    cancellationRequest.id,
  );
  TestValidator.predicate(
    "customer information present",
    approvalResponse.customer !== undefined,
  );
  TestValidator.predicate(
    "order item information present",
    approvalResponse.orderItem !== undefined,
  );
  TestValidator.predicate(
    "seller information present",
    approvalResponse.seller !== undefined,
  );
  // 7. Validate business entity relationships
  TestValidator.equals(
    "customer ID consistency",
    approvalResponse.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email consistency",
    approvalResponse.customer.email,
    customer.email,
  );
  // 8. Validate temporal consistency
  TestValidator.predicate(
    "creation timestamp valid",
    Date.parse(approvalResponse.created_at) > 0,
  );
  TestValidator.predicate(
    "update timestamp valid",
    Date.parse(approvalResponse.updated_at) > 0,
  );
  TestValidator.predicate(
    "timeline consistency",
    Date.parse(approvalResponse.created_at) <=
      Date.parse(approvalResponse.updated_at),
  );
}
