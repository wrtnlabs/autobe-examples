import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_administrator_promotion_requests_create } from "../../../generate/generate_random_ecommerce_platform_customer_administrator_promotion_requests_create";
import { prepare_random_ecommerce_platform_administrator_promotion_request_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_administrator_promotion_request_of_customer";

/**
 * Test customer submission of an administrator promotion request with pending status.
 *
 * Validates that a registered customer can submit a promotion request to become a platform administrator. The request is created with the specified actor_type ('customer') and a justification reason, entering "pending" status awaiting review by a super administrator.
 *
 * The system automatically initializes review-related fields (reviewedByAdmin, reviewedAt, rejectionReason) as null since no review has occurred yet. Timestamps (created_at, updated_at) are set to the current time.
 *
 * 1. Register and authenticate a new customer account.
 * 2. Submit an administrator promotion request with actor_type='customer' and a written justification reason.
 * 3. Validate that the returned request has status='pending', actor_type='customer', and matching reason.
 * 4. Verify that review-related fields (reviewedByAdmin, reviewedAt, rejectionReason) are null.
 */
export async function test_api_admin_promotion_request_customer_submission_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Prepare the promotion request reason
  const reason = RandomGenerator.paragraph({ sentences: 5 });
  // 3. Submit administrator promotion request
  const request =
    await generate_random_ecommerce_platform_customer_administrator_promotion_requests_create(
      customerConnection,
      {
        body: {
          actorType: "customer",
          reason,
        },
      },
    );
  typia.assert(request);
  // 4. Validate response
  TestValidator.equals("status is pending", request.status, "pending");
  TestValidator.equals("actor type is customer", request.actorType, "customer");
  TestValidator.equals("reason matches input", request.reason, reason);
  TestValidator.equals(
    "reviewedByAdmin is null",
    request.reviewedByAdmin,
    null,
  );
  TestValidator.equals("reviewedAt is null", request.reviewedAt, null);
  TestValidator.equals(
    "rejectionReason is null",
    request.rejectionReason,
    null,
  );
  TestValidator.predicate("has valid createdAt", request.createdAt !== "");
  TestValidator.predicate("has valid updatedAt", request.updatedAt !== "");
  TestValidator.predicate("has valid id", request.id !== "");
}
