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

export async function test_api_administrator_approval_request_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that a missing administrator approval request is reported as not found.
   *
   * This test authenticates as an administrator using a dedicated connection, then
   * requests an approval request record using a randomly generated UUID that should
   * not exist. It validates that the endpoint enforces administrator authentication
   * and returns a not-found error for missing governance records without mutating
   * platform state.
   *
   * 1. Authenticate with a dedicated administrator connection.
   * 2. Request a non-existent administrator approval request by UUID.
   * 3. Assert that the service responds with a not-found error.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "administrator approval request not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.administrator_approval_requests.at(
        administratorConnection,
        {
          requestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
