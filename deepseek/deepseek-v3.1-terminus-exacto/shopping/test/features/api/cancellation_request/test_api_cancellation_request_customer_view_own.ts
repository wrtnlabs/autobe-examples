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

export async function test_api_cancellation_request_customer_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Generate a random order item ID (assuming exists and belongs to customer)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create cancellation request with reason meeting length constraints
  const reason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 3,
    wordMin: 5,
    wordMax: 8,
  });
  // Ensure at least 10 characters
  const safeReason =
    reason.length >= 10
      ? reason
      : reason + " extra padding to meet minimum length";
  const cancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: orderItemId,
          reason: safeReason,
        },
      },
    );
  typia.assert(cancellationRequest);
  // 4. Retrieve the cancellation request
  const retrieved =
    await api.functional.ecommerce.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate ownership and data integrity
  TestValidator.equals(
    "cancellation request ID matches",
    retrieved.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "reason matches",
    retrieved.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "customer ID matches",
    retrieved.customer.id,
    customer.id,
  );
  TestValidator.predicate(
    "has creation timestamp",
    retrieved.created_at !== undefined && retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated timestamp",
    retrieved.updated_at !== undefined && retrieved.updated_at.length > 0,
  );
  TestValidator.equals(
    "order item ID matches",
    retrieved.orderItem.id,
    cancellationRequest.orderItem.id,
  );
  TestValidator.predicate(
    "seller exists",
    retrieved.seller !== undefined && retrieved.seller.id !== undefined,
  );
}
