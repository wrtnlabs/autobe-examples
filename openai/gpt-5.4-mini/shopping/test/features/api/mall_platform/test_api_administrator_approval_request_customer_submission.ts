import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_approval_requests_create } from "../../../generate/generate_random_mall_platform_customer_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

/**
 * Test customer submission of an administrator approval request.
 *
 * Validates that an authenticated customer can create a governance approval request with a business reason and immediately receive the persisted pending request record.
 *
 * This test focuses on the request creation flow and the immutable initial state returned by the API. It verifies the submitted reason is preserved and that review-related fields remain empty while the request is still pending.
 *
 * 1. Register and authenticate a new customer session.
 * 2. Submit an administrator approval request with a business justification.
 * 3. Validate the response preserves the submitted reason and pending workflow state.
 */
export async function test_api_administrator_approval_request_customer_submission(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const request =
    await api.functional.mallPlatform.customer.approvalRequests.create(
      customerConnection,
      {
        body: {
          reason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals("request reason", request.reason, reason);
  TestValidator.equals("request status", request.status, "pending");
  TestValidator.equals("request reviewer", request.reviewerAdministrator, null);
  TestValidator.equals(
    "request rejection reason",
    request.rejectionReason,
    null,
  );
  TestValidator.equals("request reviewed at", request.reviewedAt, null);
  TestValidator.equals("request deleted at", request.deletedAt, null);
}
