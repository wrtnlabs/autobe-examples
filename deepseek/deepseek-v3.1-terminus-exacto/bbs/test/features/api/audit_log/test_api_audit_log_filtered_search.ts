import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_log_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection for authorization
  const authConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create new connection with authorization token for API calls
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorizedAdmin.token.access,
    },
  };
  // Define comprehensive filter criteria
  const searchCriteria: IDiscussionBoardAuditLog.IRequest = {
    action_type: "user_login",
    actor_type: "user",
    created_at_start: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 7 days ago
    created_at_end: new Date().toISOString(), // current time
    success: true,
    search_term: "login",
    page: 1,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IDiscussionBoardAuditLog.IRequest;
  // Perform filtered search
  const result = await api.functional.discussionBoard.admin.audit_logs.index(
    adminConnection,
    { body: searchCriteria },
  );
  typia.assert(result);
  // Validate pagination structure using runtime checking
  TestValidator.predicate(
    "has valid pagination structure",
    result.pagination !== null &&
      typeof result.pagination === "object" &&
      Object.keys(result.pagination).length > 0,
  );
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  // If there are results, validate they match filter criteria
  if (result.data.length > 0) {
    const firstLog = result.data[0];
    // Validate action type matches filter
    if (searchCriteria.action_type) {
      TestValidator.equals(
        "action type matches filter",
        firstLog.action_type,
        searchCriteria.action_type,
      );
    }
    // Validate actor type matches filter
    if (searchCriteria.actor_type) {
      TestValidator.equals(
        "actor type matches filter",
        firstLog.actor_type,
        searchCriteria.actor_type,
      );
    }
    // Validate success status matches filter
    if (searchCriteria.success !== undefined) {
      TestValidator.equals(
        "success status matches filter",
        firstLog.success,
        searchCriteria.success,
      );
    }
    // Validate description contains search term
    if (searchCriteria.search_term) {
      TestValidator.predicate(
        "description contains search term",
        firstLog.description
          .toLowerCase()
          .includes(searchCriteria.search_term.toLowerCase()),
      );
    }
    // Validate timestamp range
    if (searchCriteria.created_at_start && searchCriteria.created_at_end) {
      const logTime = new Date(firstLog.created_at).getTime();
      const startTime = new Date(searchCriteria.created_at_start).getTime();
      const endTime = new Date(searchCriteria.created_at_end).getTime();
      TestValidator.predicate(
        "log time within range",
        logTime >= startTime && logTime <= endTime,
      );
    }
  } else {
    // Test case for empty results - validate pagination still works
    TestValidator.equals("empty result set", result.data.length, 0);
    TestValidator.predicate(
      "pagination has valid structure for empty results",
      result.pagination !== null && typeof result.pagination === "object",
    );
  }
  // Test pagination with different page
  const page2Criteria: IDiscussionBoardAuditLog.IRequest = {
    ...searchCriteria,
    page: 2,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  const page2Result =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      { body: page2Criteria },
    );
  typia.assert(page2Result);
  // Validate pagination works correctly using generic checks
  TestValidator.predicate(
    "page 2 has valid pagination structure",
    page2Result.pagination !== null && typeof page2Result.pagination === "object",
  );
  TestValidator.predicate(
    "page 2 has valid pagination size",
    Object.keys(page2Result.pagination).length > 0,
  );
}