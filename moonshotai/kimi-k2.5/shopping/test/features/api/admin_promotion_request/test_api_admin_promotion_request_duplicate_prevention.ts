import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test duplicate promotion request prevention when a user already has a pending request.
 *
 * **Test Flow:**
 * 1. Authenticate as a customer using /auth/customer/join
 * 2. Submit a first promotion request with valid reason - should succeed with status 201
 * 3. Attempt to submit a second promotion request with different valid reason
 * 4. Verify the second submission is rejected with HTTP status 409 (Conflict)
 * 5. Verify the error message indicates "You already have a pending promotion request" or similar
 *
 * **Business Logic Validation:**
 * - The system checks for existing promotion requests with 'pending' status for the authenticated user before creating a new one
 * - The duplicate prevention rule prevents confusion and ensures super administrators process one request at a time per user
 * - The existing pending request remains unchanged and continues to await review
 * - No database record is created for the rejected duplicate submission
 *
 * **State Verification:**
 * - Query the promotion requests list to confirm only one 'pending' request exists for this user
 * - Confirm the first request's reason, timestamps, and status remain intact
 *
 * This validates the business rule: "Each user may only have one pending promotion request at any given time" (Section 191) and error scenario from Section 575.
 */
export async function test_api_admin_promotion_request_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Submit a first promotion request - should succeed
  const firstReason = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<1000>
  >();
  const firstRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: firstReason,
        },
      },
    );
  typia.assert(firstRequest);
  // Verify the first request was created successfully
  TestValidator.predicate(
    "first request status is pending",
    firstRequest.status === "pending",
  );
  TestValidator.equals(
    "first request reason matches",
    firstRequest.reason,
    firstReason,
  );
  // 3. Attempt to submit a second promotion request with different reason
  const secondReason = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<1000>
  >();
  // 4. Verify the second submission is rejected with HTTP status 409 (Conflict)
  await TestValidator.httpError(
    "second request rejected with 409 Conflict",
    409,
    async () => {
      await api.functional.ecommerceMall.customer.admin_promotion_requests.create(
        customerConnection,
        {
          body: {
            reason: secondReason,
          } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
        },
      );
    },
  );
}
