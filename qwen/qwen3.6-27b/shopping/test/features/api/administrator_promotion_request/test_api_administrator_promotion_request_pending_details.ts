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
 * Test retrieval of pending administrator promotion request details.
 *
 * Validates that a customer can submit an administrator promotion request and retrieve its full details while in pending status. Ensures that the returned request contains the correct actor type, the submitted justification reason, and appropriate status value.
 *
 * Special attention is given to verifying that review-specific fields remain null for pending requests, including rejectionReason, reviewedByAdmin, and reviewedAt. The request ID must match between creation and retrieval operations.
 *
 * 1. Customer registers and authenticates via the join endpoint.
 * 2. Customer submits an administrator promotion request with actorType 'customer' and a written justification reason.
 * 3. Customer retrieves the full request details using the request ID.
 * 4. Validates that status is 'pending', actorType is 'customer', reason matches the submitted value, and all review fields (rejectionReason, reviewedByAdmin, reviewedAt) are null. Timestamps createdAt and updatedAt are populated, and the request ID is consistent.
 */
export async function test_api_administrator_promotion_request_pending_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Submit administrator promotion request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const body = {
    actorType: "customer" as const,
    reason,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate;
  const created =
    await generate_random_ecommerce_platform_customer_administrator_promotion_requests_create(
      customerConnection,
      { body },
    );
  typia.assert(created);
  // 3. Retrieve full request details
  const retrieved =
    await api.functional.ecommercePlatform.customer.administrator_promotion_requests.at(
      customerConnection,
      {
        requestId: created.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate pending request details
  TestValidator.equals("request ID matches", retrieved.id, created.id);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "actorType is customer",
    retrieved.actorType,
    "customer",
  );
  TestValidator.equals(
    "reason matches submitted value",
    retrieved.reason,
    reason,
  );
  TestValidator.equals(
    "rejectionReason is null",
    retrieved.rejectionReason,
    null,
  );
  TestValidator.equals(
    "reviewedByAdmin is null",
    retrieved.reviewedByAdmin,
    null,
  );
  TestValidator.equals("reviewedAt is null", retrieved.reviewedAt, null);
  TestValidator.predicate(
    "createdAt is populated",
    retrieved.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is populated",
    retrieved.updatedAt.length > 0,
  );
}
