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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_administrator_promotion_requests_create } from "../../../generate/generate_random_ecommerce_platform_customer_administrator_promotion_requests_create";
import { prepare_random_ecommerce_platform_administrator_promotion_request_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_administrator_promotion_request_of_customer";

/**
 * Test retrieval of approved administrator promotion request details.
 *
 * Validates the complete promotion request lifecycle from submission through super administrator approval to detail retrieval by the requesting customer. Verifies that approved requests return accurate status, retain original submission data including reason and actor type, and populate review metadata with the approving administrator's summary and timestamp.
 *
 * Special attention is given to the review metadata fields: reviewedByAdmin must contain the super administrator's summary including id, is_super, is_banned, and lifecycle timestamps, while reviewedAt must be a non-null datetime. The rejectionReason must remain null for approved requests.
 *
 * 1. Register and authenticate a customer account on the platform.
 * 2. Customer creates an administrator promotion request with a justification reason.
 * 3. Register and authenticate a super administrator.
 * 4. Super administrator approves the pending promotion request.
 * 5. Customer retrieves the full details of the approved request.
 * 6. Validate status is 'approved', actorType is 'customer', reason matches original input.
 * 7. Validate reviewedByAdmin is populated with super administrator summary and reviewedAt is non-null.
 * 8. Validate rejectionReason is null for the approved request.
 */
export async function test_api_administrator_promotion_request_approved_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials: IEcommercePlatformCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  // 2. Customer creates administrator promotion request
  const requestReason = RandomGenerator.paragraph({ sentences: 3 });
  const request =
    await generate_random_ecommerce_platform_customer_administrator_promotion_requests_create(
      customerConnection,
      {
        body: {
          actorType: "customer",
          reason: requestReason,
        },
      },
    );
  typia.assert(request);
  // 3. Register and authenticate super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 4. Super administrator approves the request
  const approveBody: IEcommercePlatformAdministratorPromotionRequestOfCustomer.IUpdate =
    {
      status: "approved",
    };
  const approvedRequest =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.update(
      adminConnection,
      {
        requestId: request.id,
        body: approveBody,
      },
    );
  typia.assert(approvedRequest);
  // 5. Customer retrieves the approved request details
  const retrievedRequest =
    await api.functional.ecommercePlatform.customer.administrator_promotion_requests.at(
      customerConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate basic request properties
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "actorType is customer",
    retrievedRequest.actorType,
    "customer",
  );
  TestValidator.equals(
    "reason matches original input",
    retrievedRequest.reason,
    requestReason,
  );
  // 7. Validate review metadata - reviewedByAdmin is populated with admin summary
  TestValidator.predicate(
    "reviewedByAdmin is non-null",
    retrievedRequest.reviewedByAdmin != null,
  );
  if (retrievedRequest.reviewedByAdmin !== null) {
    const reviewer = retrievedRequest.reviewedByAdmin;
    typia.assert(reviewer);
    // Reviewer contains super administrator summary: id, is_super, is_banned, timestamps
    TestValidator.equals(
      "reviewer is_banned is false",
      reviewer.is_banned,
      false,
    );
  }
  // 8. Validate reviewedAt timestamp is present
  TestValidator.predicate(
    "reviewedAt is non-null",
    retrievedRequest.reviewedAt !== null,
  );
  // 9. Validate rejectionReason is null for approved request
  TestValidator.equals(
    "rejectionReason is null",
    retrievedRequest.rejectionReason,
    null,
  );
}
