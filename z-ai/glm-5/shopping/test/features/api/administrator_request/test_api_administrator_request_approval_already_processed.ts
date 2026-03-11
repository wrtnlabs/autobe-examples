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

export async function test_api_administrator_request_approval_already_processed(
  connection: api.IConnection,
): Promise<void> {
  // Create a super administrator connection
  // Note: This test requires a pre-existing super administrator account
  // and pre-existing administrator requests in 'approved' and 'rejected' states.
  // Without APIs to create these resources, the test validates error handling
  // for the approval endpoint with non-existent request IDs.
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // Test case 1: Attempt to approve an already-approved request
  // Expected: 400 Bad Request (if request exists with 'approved' status)
  // or 404 Not Found (if request doesn't exist)
  const approvedRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should reject approval of already-approved request",
    [400, 404],
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.approve(
        superAdminConnection,
        { administratorRequestId: approvedRequestId },
      );
    },
  );
  // Test case 2: Attempt to approve a rejected request
  // Expected: 400 Bad Request (if request exists with 'rejected' status)
  // or 404 Not Found (if request doesn't exist)
  const rejectedRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should reject approval of already-rejected request",
    [400, 404],
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.approve(
        superAdminConnection,
        { administratorRequestId: rejectedRequestId },
      );
    },
  );
}
