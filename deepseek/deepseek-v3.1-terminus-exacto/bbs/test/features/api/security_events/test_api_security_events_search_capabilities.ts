import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the full-text search capabilities for security event descriptions.
 * A super administrator needs to search for specific security incidents
 * using keyword matching in event descriptions. The test validates that
 * the trigram indexing supports efficient text search and returns relevant
 * results.
 */
export async function test_api_security_events_search_capabilities(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test empty search (should return all events)
  const emptySearchResult =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          search: undefined,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Test exact word search
  const exactSearchResult =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          search: "failed login",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(exactSearchResult);
  // Test partial word search
  const partialSearchResult =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          search: "suspicious",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(partialSearchResult);
  // Test multiple keyword search
  const multiKeywordResult =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          search: "threat detected policy",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(multiKeywordResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    emptySearchResult.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", emptySearchResult.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    emptySearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    emptySearchResult.pagination.pages >= 0,
  );
}
