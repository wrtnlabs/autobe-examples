import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_administrator_approval_requests_create } from "../../../generate/generate_random_mall_platform_customer_administrator_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_administrator_approval_request_submission(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const request =
    await api.functional.mallPlatform.customer.administratorApprovalRequests.create(
      customerConnection,
      {
        body: {
          reason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals("submitted reason preserved", request.reason, reason);
  TestValidator.equals("request status pending", request.status, "pending");
  TestValidator.equals(
    "reviewer is empty for pending request",
    request.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "rejection reason is empty for pending request",
    request.rejectionReason,
    null,
  );
  TestValidator.equals(
    "reviewedAt is empty for pending request",
    request.reviewedAt,
    null,
  );
  TestValidator.predicate(
    "administrator summary exists",
    () => request.administrator.id.length > 0,
  );
}
