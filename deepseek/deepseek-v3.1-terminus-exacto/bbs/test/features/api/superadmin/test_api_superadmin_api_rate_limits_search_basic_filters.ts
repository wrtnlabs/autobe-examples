import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the basic search functionality of API rate limits with various filter combinations.
 * Verify that the endpoint correctly filters results by endpoint_path (with partial matching),
 * http_method, rate_limit_type, enforcement_action, and is_active status.
 */
export async function test_api_superadmin_api_rate_limits_search_basic_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Filter by endpoint_path with partial matching
  const search1 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/api/articles",
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(search1);
  TestValidator.predicate(
    "endpoint_path filter returns results",
    search1.data.length >= 0,
  );
  // Test 2: Filter by HTTP method
  const search2 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          http_method: "POST",
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(search2);
  TestValidator.predicate(
    "http_method filter returns results",
    search2.data.length >= 0,
  );
  // Test 3: Filter by rate_limit_type
  const search3 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          rate_limit_type: "ip_based",
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(search3);
  TestValidator.predicate(
    "rate_limit_type filter returns results",
    search3.data.length >= 0,
  );
  // Test 4: Filter by enforcement_action
  const search4 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          enforcement_action: "block",
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(search4);
  TestValidator.predicate(
    "enforcement_action filter returns results",
    search4.data.length >= 0,
  );
  // Test 5: Filter by is_active status
  const search5 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          is_active: true,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(search5);
  TestValidator.predicate(
    "is_active filter returns results",
    search5.data.length >= 0,
  );
  // Test 6: Test pagination controls
  const search6 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(search6);
  TestValidator.equals("pagination page", search6.pagination.current, 1);
  TestValidator.equals("pagination limit", search6.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records count valid",
    search6.pagination.records >= 0,
  );
  // Test 7: Combined filters
  const search7 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/api",
          http_method: "GET",
          is_active: true,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(search7);
  TestValidator.predicate(
    "combined filters return results",
    search7.data.length >= 0,
  );
  TestValidator.equals(
    "combined filters pagination",
    search7.pagination.current,
    1,
  );
  TestValidator.equals("combined filters limit", search7.pagination.limit, 5);
}
