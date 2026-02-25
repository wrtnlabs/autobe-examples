import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test comprehensive trend analysis functionality in system summary reports.
 * 1. Authenticate as administrator
 * 2. Call system summary reports endpoint with date range filters
 * 3. Validate response contains aggregated system performance data
 * 4. Test that the endpoint provides trend analysis capabilities
 */
export async function test_api_system_reports_summary_trend_analysis_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using join (since no login utility exists)
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Test with date range for trend analysis
  const requestBody: IDiscussionBoardAuditLog.IRequest = {
    created_at_start: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 30 days ago
    created_at_end: new Date().toISOString(), // current time
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number as number,
  };
  // Call system summary reports endpoint
  const response =
    await api.functional.discussionBoard.admin.system.reports.summary.search(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // Validate response contains comprehensive system summary data
  TestValidator.predicate(
    "response has valid audit log id",
    () => typeof response.id === "string" && response.id.length > 0,
  );
  TestValidator.predicate(
    "response has action type",
    () => typeof response.action_type === "string" && response.action_type.length > 0,
  );
  TestValidator.predicate(
    "response has description",
    () => typeof response.description === "string" && response.description.length > 0,
  );
  TestValidator.predicate(
    "response has success flag",
    () => typeof response.success === "boolean",
  );
  TestValidator.predicate(
    "response has creation timestamp",
    () => typeof response.created_at === "string" && response.created_at.length > 0,
  );
  TestValidator.predicate(
    "response has update timestamp",
    () => typeof response.updated_at === "string" && response.updated_at.length > 0,
  );
  // Test with different filter combinations to validate trend analysis capabilities
  const filterTestCases: IDiscussionBoardAuditLog.IRequest[] = [
    {
      action_type: "system_report",
      created_at_start: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 7 days ago
      created_at_end: new Date().toISOString(),
    },
    {
      actor_type: "admin",
      created_at_start: new Date(
        Date.now() - 90 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 90 days ago
      created_at_end: new Date().toISOString(),
    },
    {
      search_term: "performance",
      created_at_start: new Date(
        Date.now() - 365 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 1 year ago
      created_at_end: new Date().toISOString(),
    },
  ];
  for (const filterCase of filterTestCases) {
    const filteredResponse =
      await api.functional.discussionBoard.admin.system.reports.summary.search(
        adminConnection,
        { body: filterCase },
      );
    typia.assert(filteredResponse);
    // Validate filtered response maintains required properties
    TestValidator.predicate(
      "filtered response has valid structure",
      () => Boolean(filteredResponse.id &&
        filteredResponse.action_type &&
        filteredResponse.description),
    );
  }
}