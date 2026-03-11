import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

export async function test_api_customer_cancellation_request_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
    },
  });
  typia.assert(customerAuthorized);
  // 2. Create cancellation request with valid order item
  const cancelConnection: api.IConnection = { host: connection.host };
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      cancelConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 3. Validate business logic
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.requestStatus,
    "pending",
  );
  TestValidator.equals(
    "cancellation request reason is non-empty",
    cancellationRequest.reason.length > 0,
    true,
  );
  TestValidator.equals(
    "active cancellation request has no soft delete",
    cancellationRequest.deletedAt,
    null,
  );
  TestValidator.equals(
    "customer reference is present",
    cancellationRequest.customer.id !== undefined,
    true,
  );
  TestValidator.equals(
    "order item reference is present",
    cancellationRequest.orderItem.id !== undefined,
    true,
  );
  TestValidator.equals(
    "customer email matches registered customer",
    cancellationRequest.customer.email,
    customerAuthorized.email,
  );
}
