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

/**
 * Test administrator approval request retrieval for access control and not-found handling.
 *
 * Validates that the administrator-only approval request detail endpoint refuses unauthorized access and returns a not-found response for a missing approval request.
 *
 * 1. Register and authenticate an administrator account using a dedicated connection.
 * 2. Request a non-existent approval request ID from the authenticated administrator session.
 * 3. Verify the endpoint rejects unauthenticated access and does not expose request data.
 */
export async function test_api_administrator_approval_request_access_control_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12) + "Aa1!",
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const missingApprovalRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator approval request not found",
    [404],
    async () => {
      await api.functional.mallPlatform.administrator.approvalRequests.at(
        administratorConnection,
        {
          approvalRequestId: missingApprovalRequestId,
        },
      );
    },
  );
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to administrator approval request",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.approvalRequests.at(
        unauthorizedConnection,
        {
          approvalRequestId: missingApprovalRequestId,
        },
      );
    },
  );
}
