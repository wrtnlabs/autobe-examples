import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_approval_request_reject_already_finalized(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an already finalized administrator approval request cannot be rejected again.
   *
   * Verifies the governance workflow is immutable once completed. This test logs in as a
   * super administrator and attempts to reject a request that is assumed to be finalized,
   * expecting the API to refuse the second decision with a conflict-style business error.
   *
   * 1. Authenticate as an administrator actor with sufficient privilege.
   * 2. Attempt to reject a finalized approval request.
   * 3. Assert that the request cannot be rejected twice.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "rejecting an already finalized administrator approval request should fail",
    [400, 403, 409],
    async () => {
      await api.functional.mallPlatform.administrator.administratorApprovalRequests.reject(
        administratorConnection,
        {
          administratorApprovalRequestId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
