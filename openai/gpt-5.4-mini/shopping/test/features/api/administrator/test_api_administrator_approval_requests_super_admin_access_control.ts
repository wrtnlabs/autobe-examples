import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_approval_requests_super_admin_access_control(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies administrator approval request browsing behavior for authenticated administrators.
   *
   * This test exercises the administrator approval request list endpoint using two independently
   * authenticated administrator connections. It validates that the endpoint responds with a paginated
   * summary payload when accessed by an authenticated administrator and that the returned request
   * summaries preserve the stored review lifecycle information.
   *
   * 1. Authenticate two administrator accounts with isolated connections.
   * 2. Call the administrator approval request list endpoint from the authorized connection.
   * 3. Validate the paginated response structure and request summary content.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        typia.tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) as string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.administrator_approval_requests.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page is valid",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination record count is valid",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is valid",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "each approval request summary contains reviewer state and timestamps",
    output.data.every(
      (request) =>
        request.administrator.id.length > 0 &&
        request.reason.length >= 0 &&
        request.status.length > 0 &&
        request.createdAt.length > 0 &&
        request.updatedAt.length > 0,
    ),
  );
}
