import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test that a customer can retrieve their rejected administrator promotion request and see the rejection reason.
 *
 * Workflow:
 * 1. Customer registers and authenticates via join
 * 2. Customer submits an admin promotion request
 * 3. Super administrator registers and authenticates
 * 4. Super administrator rejects the request with a rejection reason
 * 5. Customer retrieves the promotion request using the request ID
 *
 * Validation points:
 * - Response contains correct request ID
 * - Status is 'rejected'
 * - Rejection_reason field contains the reason provided by super administrator (not null)
 * - Updated_at timestamp reflects when the rejection occurred
 * - Submitter information correctly identifies the customer
 */
export async function test_api_admin_promotion_request_view_own_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Customer submits an admin promotion request
  const promotionRequest =
    await api.functional.shoppingMall.customer.admin_promotion_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Verify initial state is pending
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "rejection reason is null initially",
    promotionRequest.rejection_reason === null ||
      promotionRequest.rejection_reason === undefined,
  );
  // 3. Super administrator registers and authenticates
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  // 4. Super administrator rejects the promotion request
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.reject(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reason: rejectionReason,
        } satisfies IShoppingMallAdminPromotionRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Customer retrieves the rejected promotion request
  const retrievedRequest =
    await api.functional.shoppingMall.customer.admin_promotion_requests.at(
      customerConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate the rejected request details
  TestValidator.equals(
    "promotion request ID matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    retrievedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejection reason is not null",
    retrievedRequest.rejection_reason !== null &&
      retrievedRequest.rejection_reason !== undefined,
  );
  TestValidator.predicate(
    "updated_at reflects rejection time",
    new Date(retrievedRequest.updated_at).getTime() >=
      new Date(promotionRequest.created_at).getTime(),
  );
  // Validate submitter information
  TestValidator.equals(
    "submitter is customer",
    retrievedRequest.actor_type,
    "customer",
  );
  typia.assertGuard(retrievedRequest.submitter!);
  if (retrievedRequest.submitter) {
    TestValidator.equals(
      "submitter email matches customer",
      retrievedRequest.submitter.email,
      customerAuth.email,
    );
  }
}
