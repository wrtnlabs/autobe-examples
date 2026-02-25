import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_patch_list_filtering_capabilities(
  connection: api.IConnection,
): Promise<void> {
  // Create base connections for multiple super administrators
  const adminConnections: api.IConnection[] = ArrayUtil.repeat(5, () => ({
    host: connection.host,
  }));
  // Create multiple super administrators with different configurations
  const superAdmins = await ArrayUtil.asyncRepeat(5, async (index) => {
    const auth = await authorize_super_admin_join(adminConnections[index], {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() satisfies
          | string
          | null as string | null,
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
    typia.assert(auth);
    return auth;
  });
  // Wait a moment to ensure different creation timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Basic filtering without any criteria
  const allResults = await api.functional.discussionBoard.super_admins.index(
    adminConnections[0],
    { body: {} satisfies IDiscussionBoardSuperAdmin.IRequest },
  );
  typia.assert(allResults);
  TestValidator.predicate("should return results", allResults.data.length > 0);
  // Test 2: Permission level filtering
  const permissionFilterResults =
    await api.functional.discussionBoard.super_admins.index(
      adminConnections[0],
      {
        body: {
          permission_level: superAdmins[0].permission_level,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(permissionFilterResults);
  TestValidator.predicate(
    "should filter by permission level",
    permissionFilterResults.data.every(
      (admin) => admin.permission_level === superAdmins[0].permission_level,
    ),
  );
  // Test 3: Date range filtering
  const startDate = new Date(Date.now() - 1000 * 60).toISOString(); // 1 minute ago
  const dateRangeResults =
    await api.functional.discussionBoard.super_admins.index(
      adminConnections[0],
      {
        body: {
          assignment_date_start: startDate,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "should include recently created admins",
    dateRangeResults.data.length > 0,
  );
  // Test 4: Pagination testing
  const page1Results = await api.functional.discussionBoard.super_admins.index(
    adminConnections[0],
    {
      body: { page: 1, limit: 2 } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(page1Results);
  TestValidator.equals(
    "page 1 should have correct limit",
    page1Results.data.length,
    2,
  );
  TestValidator.equals(
    "page info should be correct",
    page1Results.pagination.current,
    1,
  );
  const page2Results = await api.functional.discussionBoard.super_admins.index(
    adminConnections[0],
    {
      body: { page: 2, limit: 2 } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(page2Results);
  TestValidator.equals(
    "page 2 should have correct current",
    page2Results.pagination.current,
    2,
  );
  // Test 5: Combined filtering
  const combinedResults =
    await api.functional.discussionBoard.super_admins.index(
      adminConnections[0],
      {
        body: {
          permission_level: superAdmins[0].permission_level,
          assignment_date_start: startDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filtering should work",
    combinedResults.data.every(
      (admin) => admin.permission_level === superAdmins[0].permission_level,
    ),
  );
}
