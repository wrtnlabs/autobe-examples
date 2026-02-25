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

export async function test_api_security_events_search_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Test various filter combinations
  // Test: Filter by event_type
  const eventTypeResult =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          event_type: "security_event", // Use generic placeholder
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(eventTypeResult);
  // Test: Filter by severity
  const severityResult =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          severity: "medium", // Use middle severity that likely exists
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(severityResult);
  // Test: Filter by resolution status
  const resolvedResult =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          resolved: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(resolvedResult);
  // Test: Text search in description
  const searchResult =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          search: "test", // Generic search term
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(searchResult);
  // Test: Date range filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeResult =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          created_at_start: yesterday,
          created_at_end: tomorrow,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Test: Combined filters
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          severity: "low", // Use lowest severity likely to have data
          resolved: false,
          search: "", // Empty search should return all
          created_at_start: yesterday,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate pagination structure for all results
  await TestValidator.predicate(
    "all results have pagination structure",
    () => !!eventTypeResult.pagination &&
          !!severityResult.pagination &&
          !!resolvedResult.pagination,
  );
}