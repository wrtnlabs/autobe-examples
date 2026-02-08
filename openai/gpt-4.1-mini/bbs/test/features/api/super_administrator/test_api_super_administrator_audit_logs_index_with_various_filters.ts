import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_audit_logs_index_with_various_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Primary success path for retrieving audit logs with no filters
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinAuth = await authorize_super_administrator_join(
    superAdminConnection,
    { body: {} },
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${joinAuth.token.access}`,
  };
  // Call with empty filter criteria
  const emptyFilterBody: IDiscussionBoardAuditLog.IRequest = {};
  const resNoFilter =
    await api.functional.discussionBoard.superAdministrator.auditLogs.index(
      superAdminConnection,
      {
        body: emptyFilterBody,
      },
    );
  typia.assert(resNoFilter);
  // Validate pagination metadata is coherent
  const page = resNoFilter.pagination;
  TestValidator.predicate(
    "Scenario 1: current page is not less than 1",
    page.current >= 1,
  );
  TestValidator.predicate(
    "Scenario 1: total pages is non-negative",
    page.pages >= 0,
  );
  TestValidator.predicate(
    "Scenario 1: total records is non-negative",
    page.records >= 0,
  );
  // If no records, pages should be 0
  if (page.records === 0) {
    TestValidator.equals(
      "Scenario 1: pages should be 0 if no records",
      page.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "Scenario 1: pages is at least 1 if records exist",
      page.pages >= 1,
    );
  }
  // Scenario 2: Filter audit logs by event type and actor ID
  const filterByEventActorBody: IDiscussionBoardAuditLog.IRequest = {
    eventType: "user_login",
    actorId: joinAuth.token.access, // For demonstration; using token string as actorId placeholder
  } as any; // forcibly use any because schema is empty
  const resFilteredByEventActor =
    await api.functional.discussionBoard.superAdministrator.auditLogs.index(
      superAdminConnection,
      {
        body: filterByEventActorBody,
      },
    );
  typia.assert(resFilteredByEventActor);
  // Scenario 3: Filter audit logs by creation date range and keyword
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const filterByDateKeywordBody: IDiscussionBoardAuditLog.IRequest = {
    createdFrom: twoDaysAgo.toISOString(),
    createdTo: now.toISOString(),
    keyword: "approved",
  } as any; // forcibly use any because schema is empty
  const resFilteredByDateKeyword =
    await api.functional.discussionBoard.superAdministrator.auditLogs.index(
      superAdminConnection,
      {
        body: filterByDateKeywordBody,
      },
    );
  typia.assert(resFilteredByDateKeyword);
}
