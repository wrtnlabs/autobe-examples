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

export async function test_api_administrator_approval_request_search_empty_result(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator approval request search returns an empty page when no records match.
   *
   * Verifies administrative browsing behavior for a fully authenticated administrator
   * connection. The scenario intentionally applies filters that should not match any
   * approval request records so the API returns a normal empty page with consistent
   * pagination metadata instead of an error.
   *
   * 1. Register and authenticate an administrator using an isolated connection.
   * 2. Search administrator approval requests with an intentionally unmatched filter set.
   * 3. Validate that the response page is empty and pagination metadata is consistent.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const response =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.index(
      adminConnection,
      {
        body: {
          administratorId: typia.random<string & tags.Format<"uuid">>(),
          reviewerAdministratorId: typia.random<string & tags.Format<"uuid">>(),
          status: "rejected",
          reason: RandomGenerator.alphabets(32),
          rejectionReason: RandomGenerator.alphabets(32),
          createdAtFrom: new Date(
            Date.now() + 1000 * 60 * 60 * 24,
          ).toISOString(),
          createdAtTo: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
          reviewedAtFrom: new Date(
            Date.now() + 1000 * 60 * 60 * 24,
          ).toISOString(),
          reviewedAtTo: new Date(
            Date.now() + 1000 * 60 * 60 * 48,
          ).toISOString(),
          updatedAtFrom: new Date(
            Date.now() + 1000 * 60 * 60 * 24,
          ).toISOString(),
          updatedAtTo: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
          page: 1,
          limit: 10,
          sort: "-updatedAt",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "approval request search should return zero records",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "approval request search should return zero data items",
    response.data.length,
    0,
  );
  TestValidator.equals(
    "approval request search should keep the requested page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "approval request search should keep the requested page size",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "approval request search should report zero pages when empty",
    response.pagination.pages,
    0,
  );
}
