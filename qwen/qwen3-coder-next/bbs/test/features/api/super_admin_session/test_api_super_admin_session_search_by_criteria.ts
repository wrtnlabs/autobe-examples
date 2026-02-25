import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_session_search_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection for session operations
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create multiple sessions with different criteria by simulating login
  // Since we can't directly create sessions, we'll use the search endpoint
  // with varied search criteria to test different scenarios
  // Search by partial IP address match
  const ipSearchResult =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.index(
      superAdminConnection,
      {
        body: {
          ip: "192.168",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(ipSearchResult);
  // Search by partial user agent string match
  const userAgentSearchResult =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.index(
      superAdminConnection,
      {
        body: {
          user_agent: "Mozilla",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(userAgentSearchResult);
  // Search by partial referrer URL match
  const referrerSearchResult =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.index(
      superAdminConnection,
      {
        body: {
          referrer: "https://example",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(referrerSearchResult);
  // Search by active status
  const activeSearchResult =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.index(
      superAdminConnection,
      {
        body: {
          active: true,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(activeSearchResult);
  // Search by inactive status
  const inactiveSearchResult =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.index(
      superAdminConnection,
      {
        body: {
          active: false,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(inactiveSearchResult);
  // Verify search results are properly paginated
  const paginationCheck = [ipSearchResult, userAgentSearchResult, referrerSearchResult, activeSearchResult, inactiveSearchResult].every(
    (r) => r.pagination !== undefined
  );
  TestValidator.predicate("results have pagination", paginationCheck);
  // Verify data arrays are valid
  const dataArrayCheck = [ipSearchResult, userAgentSearchResult, referrerSearchResult, activeSearchResult, inactiveSearchResult].every(
    (r) => Array.isArray(r.data)
  );
  TestValidator.predicate("all search results have data arrays", dataArrayCheck);
}