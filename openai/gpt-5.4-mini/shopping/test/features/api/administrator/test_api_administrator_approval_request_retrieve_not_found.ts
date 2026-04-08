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

export async function test_api_administrator_approval_request_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify missing administrator approval requests are rejected with not found.
   *
   * This test authenticates an administrator through the required join flow, then
   * requests a random approval request UUID that is not expected to exist in the
   * governance history.
   *
   * 1. Create an isolated administrator connection from the base host.
   * 2. Authenticate the administrator using the join utility.
   * 3. Request a random approval request UUID that does not map to any record.
   * 4. Assert the API returns a 404 not-found error and does not expose any approval
   *    request fields.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "administrator approval request should not be found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.approval_requests.at(
        administratorConnection,
        {
          approvalRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
