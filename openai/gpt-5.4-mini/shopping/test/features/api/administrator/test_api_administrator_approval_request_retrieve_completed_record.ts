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
 * Retrieve a completed administrator approval request record.
 *
 * Verifies that the administrator approval request detail endpoint returns a
 * fully typed record for governance review and preserves the approval-request
 * schema fields used for auditing completed decisions.
 *
 * The test authenticates an administrator, performs a retrieval call, and
 * validates the response shape. It is intentionally conservative because the
 * available test materials do not provide a dedicated workflow for creating a
 * real completed administrator approval request record.
 *
 * 1. Authenticate as an administrator using the provided join utility.
 * 2. Retrieve an administrator approval request by UUID.
 * 3. Validate the returned payload against the DTO schema.
 */
export async function test_api_administrator_approval_request_retrieve_completed_record(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const response =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.at(
      adminConnection,
      {
        administratorApprovalRequestId: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    );
  typia.assert(response);
}
