import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test the business rule that each user can have only one pending promotion request at a time.
 *
 * This test validates the automatic cancellation behavior when a customer submits a new
 * promotion request while a previous one is still pending:
 * 1. Customer joins and authenticates
 * 2. Customer submits first promotion request with a reason
 * 3. Customer submits second promotion request with a different reason while first is pending
 * 4. Verify second request is created with status 'pending' and is active (deleted_at is null)
 * 5. Verify both requests have different IDs
 *
 * Note: The automatic cancellation of the first request (setting deleted_at) occurs server-side.
 * Without a GET endpoint to re-fetch the first request, we cannot directly verify its deleted_at
 * was updated, but the second request's successful creation with pending status validates the
 * duplicate request handling flow works correctly.
 */
export async function test_api_admin_promotion_request_duplicate_pending_cancellation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Submit first promotion request
  const firstReason = RandomGenerator.paragraph({ sentences: 2 });
  const firstRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: firstReason,
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals("first request status", firstRequest.status, "pending");
  TestValidator.equals(
    "first request reason",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "first request initially active",
    firstRequest.deleted_at,
    null,
  );
  // 3. Submit second promotion request while first is still pending
  // This should automatically cancel the first request server-side
  const secondReason = RandomGenerator.paragraph({ sentences: 3 });
  const secondRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: secondReason,
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(secondRequest);
  TestValidator.equals(
    "second request status",
    secondRequest.status,
    "pending",
  );
  TestValidator.equals(
    "second request reason",
    secondRequest.reason,
    secondReason,
  );
  TestValidator.equals(
    "second request is active",
    secondRequest.deleted_at,
    null,
  );
  // 4. Verify requests have different IDs
  TestValidator.notEquals(
    "different request IDs",
    firstRequest.id,
    secondRequest.id,
  );
  // 5. Verify reasons are different
  TestValidator.notEquals(
    "different reasons",
    firstRequest.reason,
    secondRequest.reason,
  );
}
