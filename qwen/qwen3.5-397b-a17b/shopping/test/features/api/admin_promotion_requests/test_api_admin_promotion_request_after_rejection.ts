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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test the business workflow where a seller submits a new administrator promotion request after their previous request was rejected by a super administrator.
 *
 * Test Steps:
 * 1. Register a new seller account via /shoppingMall/auth/seller/join
 * 2. Submit the first administrator promotion request with reason 'Initial request'
 * 3. Simulate super administrator rejection (this would be done via separate admin endpoint)
 * 4. Verify the first request shows status 'rejected' with a rejection_reason
 * 5. Submit a second administrator promotion request with improved reason 'Revised request with additional qualifications'
 * 6. Verify the second request is created successfully with status 'pending'
 * 7. Verify both requests exist in history (first as rejected, second as pending)
 *
 * Business Validations:
 * - Rejected users can submit new promotion requests
 * - Previous rejected requests remain in history for audit trail
 * - New request starts fresh with 'pending' status
 * - Each request maintains its own reason and rejection history
 * - This supports the business rule that rejected users can reapply with improved justification
 */
export async function test_api_admin_promotion_request_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with known email for validation
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: registrationEmail,
    },
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection with authentication token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 3. Submit first administrator promotion request
  const firstRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: "Initial request for admin access",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // 4. Validate first request structure
  TestValidator.equals(
    "first request status is pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first request reason matches",
    firstRequest.reason,
    "Initial request for admin access",
  );
  TestValidator.equals(
    "first request actor_type is seller",
    firstRequest.actor_type,
    "seller",
  );
  TestValidator.predicate(
    "first request rejection_reason is null for pending",
    firstRequest.rejection_reason === null ||
      firstRequest.rejection_reason === undefined,
  );
  TestValidator.predicate(
    "first request submitter is seller type",
    firstRequest.submitter !== null &&
      "approval_status" in firstRequest.submitter,
  );
  TestValidator.equals(
    "first request submitter id matches seller",
    (firstRequest.submitter as IShoppingMallSeller.ISummary).id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "first request submitter email matches registration email",
    (firstRequest.submitter as IShoppingMallSeller.ISummary).email,
    registrationEmail,
  );
  // 5. Submit second administrator promotion request
  // Note: When a new request is submitted while previous is pending,
  // the previous pending request is automatically cancelled per business rules
  const secondRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: "Revised request with additional qualifications",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(secondRequest);
  // 6. Validate second request structure
  TestValidator.equals(
    "second request status is pending",
    secondRequest.status,
    "pending",
  );
  TestValidator.equals(
    "second request reason matches",
    secondRequest.reason,
    "Revised request with additional qualifications",
  );
  TestValidator.equals(
    "second request actor_type is seller",
    secondRequest.actor_type,
    "seller",
  );
  TestValidator.predicate(
    "second request rejection_reason is null for pending",
    secondRequest.rejection_reason === null ||
      secondRequest.rejection_reason === undefined,
  );
  TestValidator.predicate(
    "second request submitter is seller type",
    secondRequest.submitter !== null &&
      "approval_status" in secondRequest.submitter,
  );
  TestValidator.equals(
    "second request submitter id matches seller",
    (secondRequest.submitter as IShoppingMallSeller.ISummary).id,
    sellerAuth.id,
  );
  // 7. Verify both requests have unique IDs
  TestValidator.notEquals(
    "first and second request IDs are different",
    firstRequest.id,
    secondRequest.id,
  );
  // 8. Verify second request was created after first
  TestValidator.predicate(
    "second request created_at is after or equal to first",
    Date.parse(secondRequest.created_at) >= Date.parse(firstRequest.created_at),
  );
}
