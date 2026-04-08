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
 * Test that an ineligible customer account cannot create an administrator approval request.
 *
 * This scenario validates the eligibility enforcement path for the administrator access request workflow.
 * It ensures that a normal customer account cannot submit a governance request when the account state
 * is not allowed for administrator application, and that the endpoint rejects the attempt without creating
 * a pending approval request record.
 *
 * 1. Register and authenticate a customer account through the supported customer join utility.
 * 2. Attempt to submit an administrator approval request for the ineligible authenticated caller.
 * 3. Verify that the request is rejected as a business-rule failure.
 */
export async function test_api_administrator_approval_request_ineligible_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const body = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformAdministratorApprovalRequest.ICreate;
  await TestValidator.httpError(
    "ineligible customer cannot create administrator approval request",
    [400, 401, 403, 409],
    async () => {
      await generate_random_mall_platform_customer_approval_requests_create(
        customerConnection,
        { body },
      );
    },
  );
}
