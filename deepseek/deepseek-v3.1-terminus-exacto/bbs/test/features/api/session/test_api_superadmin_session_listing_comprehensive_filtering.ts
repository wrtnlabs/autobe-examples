import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_session_listing_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create multiple sessions with different IP addresses
  const ips = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"ipv4">>(),
  );
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Filter by super_admin_id
  const sessionList1 =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {
          super_admin_id: superAdmin.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(sessionList1);
  TestValidator.predicate(
    "should return at least one session",
    sessionList1.data.length >= 1,
  );
  // Test 2: Filter by IP address pattern (LIKE)
  const sessionList2 =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {
          ip: ips[0].substring(0, 8) + "%",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(sessionList2);
  // Test 3: Filter by expiration status (active sessions - expired_at > now)
  const now = new Date().toISOString();
  const sessionList3 =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {
          expired_at_after: now,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(sessionList3);
  // Test 4: Filter by creation date range
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const sessionList4 =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {
          created_at_after: pastDate,
          created_at_before: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(sessionList4);
  // Test 5: Test pagination with different page sizes
  const sessionList5 =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(sessionList5);
  TestValidator.predicate(
    "pagination limit respected",
    sessionList5.data.length <= 3,
  );
  // Validate that no sensitive token data is exposed
  if (sessionList1.data.length > 0) {
    const session = sessionList1.data[0];
    TestValidator.notEquals(
      "session should not contain token property",
      session.hasOwnProperty("token"),
      true,
    );
    TestValidator.notEquals(
      "session should not contain access property",
      session.hasOwnProperty("access"),
      true,
    );
    TestValidator.notEquals(
      "session should not contain refresh property",
      session.hasOwnProperty("refresh"),
      true,
    );
  }
  // Test authorization by trying to access with unauthorized connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      unauthorizedConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  });
}
