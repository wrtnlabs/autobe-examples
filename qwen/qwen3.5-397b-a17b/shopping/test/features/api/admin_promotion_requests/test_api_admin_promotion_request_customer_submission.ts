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
 * Test customer administrator promotion request submission.
 *
 * This test verifies the complete workflow where a customer submits a request
 * to become an administrator:
 * 1. Customer registers and authenticates
 * 2. Customer submits promotion request with valid reason
 * 3. Request is created with 'pending' status
 * 4. Response contains complete promotion request entity
 * 5. Request is properly associated with the customer account
 */
export async function test_api_admin_promotion_request_customer_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authResult);
  // 2. Submit administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Validate business logic - actor type and status
  TestValidator.equals(
    "actor type is customer",
    promotionRequest.actor_type,
    "customer",
  );
  TestValidator.equals("status is pending", promotionRequest.status, "pending");
  TestValidator.predicate(
    "reason is non-empty",
    promotionRequest.reason.length > 0,
  );
  TestValidator.equals(
    "rejection reason is null for pending request",
    promotionRequest.rejection_reason,
    null,
  );
  // 4. Validate submitter information matches authenticated customer
  TestValidator.equals(
    "submitter id matches customer",
    promotionRequest.submitter.id,
    authResult.id,
  );
  TestValidator.equals(
    "submitter email matches customer",
    promotionRequest.submitter.email,
    authResult.email,
  );
}
