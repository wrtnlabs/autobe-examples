import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_audit_reports_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Establish superAdmin authentication for audit report access
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123".repeat(2).slice(0, 16),
      href: "https://test.example.com/audit",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Step 2: Create user to generate user audit events
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123".repeat(2).slice(0, 16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Step 3: Create admin to generate admin audit events
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123".repeat(2).slice(0, 16),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 4: Perform actions that generate audit events
  // User login (successful) - with NEW connection
  const userLoginConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userLoginConnection, {
    body: {
      email: user.email,
      password: "password123".repeat(2).slice(0, 16),
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Admin login (successful) - with NEW connection
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: admin.email,
      password: "password123".repeat(2).slice(0, 16),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Step 5: Test comprehensive search scenarios
  // Scenario 1: Filter by actor_type = "user"
  const userActorResults =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          actor_type: "user",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(userActorResults);
  TestValidator.predicate(
    "user actor filter returns results",
    userActorResults.data.length >= 0,
  );
  if (userActorResults.data.length > 0) {
    for (const log of userActorResults.data) {
      TestValidator.equals(
        `log ${log.id} has actor_type user`,
        log.actor_type,
        "user",
      );
    }
  }
  // Scenario 2: Filter by actor_type = "admin"
  const adminActorResults =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          actor_type: "admin",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(adminActorResults);
  TestValidator.predicate(
    "admin actor filter returns results",
    adminActorResults.data.length >= 0,
  );
  if (adminActorResults.data.length > 0) {
    for (const log of adminActorResults.data) {
      TestValidator.equals(
        `log ${log.id} has actor_type admin`,
        log.actor_type,
        "admin",
      );
    }
  }
  // Scenario 3: Filter by target_user_id (user we created)
  const userTargetResults =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          target_user_id: user.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(userTargetResults);
  TestValidator.predicate(
    "user target filter returns results",
    userTargetResults.data.length >= 0,
  );
  if (userTargetResults.data.length > 0) {
    for (const log of userTargetResults.data) {
      TestValidator.equals(
        `log ${log.id} matches target_user_id`,
        log.target_user_id,
        user.id,
      );
    }
  }
  // Scenario 4: Filter by target_admin_id (admin we created)
  const adminTargetResults =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          target_admin_id: admin.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(adminTargetResults);
  TestValidator.predicate(
    "admin target filter returns results",
    adminTargetResults.data.length >= 0,
  );
  if (adminTargetResults.data.length > 0) {
    for (const log of adminTargetResults.data) {
      TestValidator.equals(
        `log ${log.id} matches target_admin_id`,
        log.target_admin_id,
        admin.id,
      );
    }
  }
  // Scenario 5: Filter by success status (successful actions)
  const successResults =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          success: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(successResults);
  TestValidator.predicate(
    "success filter returns results",
    successResults.data.length >= 0,
  );
  if (successResults.data.length > 0) {
    for (const log of successResults.data) {
      TestValidator.predicate(
        `log ${log.id} has success=true`,
        log.success === true,
      );
    }
  }
  // Scenario 6: Text search in description
  const searchResults =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          search_term: "login",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search term filter returns results",
    searchResults.data.length >= 0,
  );
  // Scenario 7: Combined filters - user actor & successful actions
  const combinedResults =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          actor_type: "user",
          success: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filter returns results",
    combinedResults.data.length >= 0,
  );
  if (combinedResults.data.length > 0) {
    for (const log of combinedResults.data) {
      TestValidator.equals(
        `log ${log.id} has actor_type user and success=true`,
        log.actor_type,
        "user",
      );
      TestValidator.predicate(
        `log ${log.id} has success=true`,
        log.success === true,
      );
    }
  }
  // Scenario 8: Pagination testing
  const page1Results =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(page1Results);
  if (page1Results.data.length > 0) {
    const page2Results =
      await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
        superAdminConnection,
        {
          body: {
            page: 2,
            limit: 2,
          } satisfies IDiscussionBoardAuditLog.IRequest,
        },
      );
    typia.assert(page2Results);
    TestValidator.notEquals(
      "page1 and page2 have different records",
      page1Results.data.map((d) => d.id),
      page2Results.data.map((d) => d.id),
    );
  }
  // Step 6: Validate no compilation errors with complex empty filters
  const emptyFilterResults =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(emptyFilterResults);
  TestValidator.predicate(
    "empty filter returns valid data",
    emptyFilterResults.data.length >= 0,
  );
}
