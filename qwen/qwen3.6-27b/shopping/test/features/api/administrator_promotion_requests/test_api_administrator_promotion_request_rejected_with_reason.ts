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
 * Test administrator promotion request rejection workflow with reason validation.
 *
 * Validates that when a customer's promotion request is rejected by a super administrator, the request details correctly reflect the rejection state including status, rejection reason, reviewer identity, and review timestamp.
 *
 * 1. Customer registers and authenticates.
 * 2. Super administrator registers and authenticates.
 * 3. Customer submits an administrator promotion request with justification.
 * 4. Super administrator rejects the request with a rejection reason.
 * 5. Customer retrieves the rejected request details.
 * 6. Validates rejection status, rejection reason, reviewed admin identity, and review timestamp.
 */
export async function test_api_administrator_promotion_request_rejected_with_reason(
  connection: api.IConnection,
) {
  // 1. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Super administrator registers and authenticates
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 3. Customer creates an administrator promotion request
  const requestBody = {
    actorType: "customer" satisfies string &
      tags.Pattern<"^(customer|seller)$">,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate;
  const request =
    await api.functional.ecommercePlatform.customer.administrator_promotion_requests.create(
      customerConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(request);
  // 4. Super administrator rejects the request with a rejection reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updateBody = {
    status: "rejected" satisfies "approved" | "rejected",
    rejectionReason: rejectionReason,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IUpdate;
  const updatedRequest =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.update(
      superAdminConnection,
      {
        requestId: request.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRequest);
  // 5. Customer retrieves the rejected request
  const retrievedRequest =
    await api.functional.ecommercePlatform.customer.administrator_promotion_requests.at(
      customerConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate rejection status
  TestValidator.equals(
    "request status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  // 7. Validate rejection reason is not null
  TestValidator.predicate(
    "rejection reason is present",
    () => retrievedRequest.rejectionReason !== null,
  );
  // 8. Validate reviewedByAdmin is not null
  TestValidator.predicate(
    "reviewed by admin is present",
    () => retrievedRequest.reviewedByAdmin !== null,
  );
  // 9. Validate reviewedAt is not null
  TestValidator.predicate(
    "reviewed at timestamp is present",
    () => retrievedRequest.reviewedAt !== null,
  );
}
