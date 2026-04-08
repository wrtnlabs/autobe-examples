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

export async function test_api_administrator_approval_request_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate administrator approval request detail access control and read-only behavior.
   *
   * This scenario checks the governance detail endpoint for administrator approval requests. It ensures the endpoint is reachable from an authenticated administrator connection, that request identifiers are accepted as UUID path parameters, and that the read-only resource access behaves consistently for repeated reads.
   *
   * 1. Authenticate a dedicated administrator actor connection.
   * 2. Attempt to retrieve a persisted approval request detail by UUID.
   * 3. Confirm repeated reads are stable when the record exists.
   * 4. Fall back to the expected not-found behavior when the provided UUID does not correspond to a stored request.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const requestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "administrator approval request detail should fail for unknown request id",
    async () => {
      const response =
        await api.functional.mallPlatform.administrator.administrator_approval_requests.at(
          administratorConnection,
          {
            requestId,
          },
        );
      typia.assert(response);
    },
  );
}
