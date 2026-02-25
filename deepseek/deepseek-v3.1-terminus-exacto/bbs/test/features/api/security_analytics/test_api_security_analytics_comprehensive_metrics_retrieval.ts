import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_security_analytics_comprehensive_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate consistent credentials for registration and login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create super admin account
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Authenticate super admin using utility function
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Query security analytics with comprehensive filtering parameters
  const analyticsRequest: IDiscussionBoardSecurityEvent.IRequest = {
    event_type: "authentication_failure",
    severity: "high",
    resolved: false,
    created_at_start: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_at_end: new Date().toISOString(),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.system.analytics.security.index(
      superAdminConnection,
      { body: analyticsRequest },
    );
  typia.assert(analyticsResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination object exists",
    analyticsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(analyticsResponse.data),
  );
  // Validate pagination structure - focusing on existing properties only
  const pagination = analyticsResponse.pagination;
  // Check actual pagination properties instead of assuming legacy structure
  const paginationKeys = Object.keys(pagination);
  TestValidator.predicate(
    "pagination has valid properties",
    paginationKeys.length > 0,
  );
  // Validate security event summaries
  if (analyticsResponse.data.length > 0) {
    const event = analyticsResponse.data[0];
    TestValidator.equals("event has id", typeof event.id, "string");
    TestValidator.equals(
      "event has event_type",
      typeof event.event_type,
      "string",
    );
    TestValidator.equals("event has severity", typeof event.severity, "string");
    TestValidator.equals(
      "event has description",
      typeof event.description,
      "string",
    );
    TestValidator.equals(
      "event has source_ip",
      typeof event.source_ip,
      "string",
    );
    TestValidator.equals(
      "event has resolved",
      typeof event.resolved,
      "boolean",
    );
    TestValidator.equals(
      "event has created_at",
      typeof event.created_at,
      "string",
    );
    // Validate actor associations (can be null)
    TestValidator.predicate(
      "user can be null or object",
      event.user === null || typeof event.user === "object",
    );
    TestValidator.predicate(
      "admin can be null or object",
      event.admin === null || typeof event.admin === "object",
    );
    TestValidator.predicate(
      "superAdmin can be null or object",
      event.superAdmin === null || typeof event.superAdmin === "object",
    );
  }
  // Test with different filter combinations
  const testCases = [
    { event_type: "user_login", severity: "medium" },
    { event_type: "content_moderation", severity: "low" },
    { resolved: true },
    { search: "failed" },
  ];
  for (const testCase of testCases) {
    const testRequest: IDiscussionBoardSecurityEvent.IRequest = {
      ...testCase,
      page: 1,
      limit: 10,
    };
    const testResponse =
      await api.functional.discussionBoard.superAdmin.system.analytics.security.index(
        superAdminConnection,
        { body: testRequest },
      );
    typia.assert(testResponse);
    TestValidator.predicate(
      "test response has valid structure",
      testResponse.pagination !== undefined && Array.isArray(testResponse.data),
    );
  }
}