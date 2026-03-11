import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test audit log search pagination functionality at various boundary conditions.
 * Validates robust pagination handling including first page requests, pages beyond
 * available data range, and different limit values (minimum, maximum, typical).
 */
export async function test_api_audit_log_search_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Test 1: First page with minimum limit (1)
  const minLimitRequest: IDiscussionBoardAuditLog.IRequest = {
    page: 1,
    limit: 1,
  };
  const minLimitResponse =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      { body: minLimitRequest },
    );
  typia.assert(minLimitResponse);
  // Test 2: First page with maximum limit (100)
  const maxLimitRequest: IDiscussionBoardAuditLog.IRequest = {
    page: 1,
    limit: 100,
  };
  const maxLimitResponse =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      { body: maxLimitRequest },
    );
  typia.assert(maxLimitResponse);
  // Test 3: Page beyond available data range
  const beyondRangeRequest: IDiscussionBoardAuditLog.IRequest = {
    page: 999999,
    limit: 10,
  };
  const beyondRangeResponse =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      { body: beyondRangeRequest },
    );
  typia.assert(beyondRangeResponse);
  // Validate that when requesting page beyond total pages, data array is empty
  if (
    beyondRangeResponse.pagination.current >
    beyondRangeResponse.pagination.pages
  ) {
    TestValidator.equals(
      "beyond range data empty",
      beyondRangeResponse.data.length,
      0,
    );
  }
  // Test 4: Invalid page number (page=0)
  const invalidPageRequest: IDiscussionBoardAuditLog.IRequest = {
    page: 0,
    limit: 10,
  };
  const invalidPageResponse =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      { body: invalidPageRequest },
    );
  typia.assert(invalidPageResponse);
  // Test 5: Typical page with moderate limit
  const typicalRequest: IDiscussionBoardAuditLog.IRequest = {
    page: 2,
    limit: 25,
  };
  const typicalResponse =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      { body: typicalRequest },
    );
  typia.assert(typicalResponse);
  // Test 6: Pagination consistency across different filters
  const filteredRequest: IDiscussionBoardAuditLog.IRequest = {
    page: 1,
    limit: 10,
    actorType: "admin",
  };
  const filteredResponse =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      { body: filteredRequest },
    );
  typia.assert(filteredResponse);
}
