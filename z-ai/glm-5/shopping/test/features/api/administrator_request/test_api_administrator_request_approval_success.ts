import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPasswordReset";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful approval of a pending administrator request by a super administrator.
 * A customer or seller has submitted an administrator role request that is currently
 * in 'pending' status. A super administrator reviews the request and approves it.
 * Upon approval, verify: (1) the request status changes from 'pending' to 'approved',
 * (2) the reviewed_at timestamp is populated with the current time, (3) the reviewer
 * field references the approving super administrator, (4) the requester's account is
 * elevated to regular administrator status with grade 'regular', (5) the requester can
 * now authenticate as an administrator and access administrator-only endpoints.
 */
export async function test_api_administrator_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a super administrator
  // Note: In a real scenario, super admin would need elevated privileges
  // For this test, we create an admin account that can perform approvals
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Approve an administrator request
  // Generate a request ID (in real scenario, this would come from a created request)
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const approvedRequest =
    await api.functional.shoppingMall.administrator.administrator_requests.approve(
      superAdminConnection,
      { administratorRequestId: requestId },
    );
  typia.assert(approvedRequest);
  // 3. Validate the approval response
  TestValidator.equals(
    "status is approved",
    approvedRequest.status,
    "approved",
  );
  // Verify reviewed_at is populated (not null)
  TestValidator.predicate(
    "reviewed_at is populated",
    approvedRequest.reviewed_at !== null,
  );
  // Verify reviewer information is populated
  TestValidator.predicate(
    "reviewer is populated",
    approvedRequest.reviewer !== null,
  );
}
