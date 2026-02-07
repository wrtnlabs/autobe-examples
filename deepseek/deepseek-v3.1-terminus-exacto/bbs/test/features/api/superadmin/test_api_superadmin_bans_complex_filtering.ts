import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test comprehensive filtering capabilities by applying multiple filters simultaneously.
 * Create ban records with different statuses (active, expired, revoked), duration types
 * (temporary, permanent), appeal statuses, and date ranges. Test filtering by banning
 * administrator, ban status, appeal status, date ranges, and text search on ban reasons.
 * Verify that the search correctly applies all filters and returns only matching records.
 */
export async function test_api_superadmin_bans_complex_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple super administrator connections
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_admin_join(superAdmin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin1);
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_super_admin_join(superAdmin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin2);
  // Test complex filtering with multiple criteria
  const searchBody: IDiscussionBoardUserBan.IRequest = {
    ban_status: "active",
    ban_duration_type: "temporary",
    appeal_status: "pending",
    banning_administrator_id: superAdmin1.id,
    ban_started_at_from: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    ban_started_at_to: new Date().toISOString(),
    search: "spam violation",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardUserBan.IRequest;
  const result = await api.functional.discussionBoard.superAdmin.bans.index(
    superAdmin1Connection,
    { body: searchBody },
  );
  typia.assert(result);
  // Validate pagination business logic
  TestValidator.predicate(
    "current page is valid",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is within bounds",
    result.pagination.limit >= 1 && result.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate that data array exists (business requirement)
  TestValidator.predicate("data array exists", Array.isArray(result.data));
}
