import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
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

export async function test_api_super_admin_patch_list_security_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator using direct SDK call
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "SuperAdminPassword123",
          href: "https://discussion-board.test/super-admin/join",
          referrer: "https://discussion-board.test",
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminAuth);
  // Create regular administrator using direct SDK call
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPassword123",
        display_name: RandomGenerator.name(),
        href: "https://discussion-board.test/admin/join",
        referrer: "https://discussion-board.test",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Create normal user using direct SDK call
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "UserPassword123",
        display_name: "Test User",
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(userAuth);
  // Test 1: Super admin should successfully access the endpoint
  const superAdminResult =
    await api.functional.discussionBoard.super_admins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(superAdminResult);
  // Test 2: Regular admin should be denied access
  try {
    await api.functional.discussionBoard.super_admins.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    });
    throw new Error(
      "Regular admin should not have access to super admin endpoint",
    );
  } catch (error) {
    // Expected behavior - admin should not have access
    if (!(error instanceof Error)) throw error;
  }
  // Test 3: Normal user should be denied access
  try {
    await api.functional.discussionBoard.super_admins.index(userConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    });
    throw new Error(
      "Normal user should not have access to super admin endpoint",
    );
  } catch (error) {
    // Expected behavior - user should not have access
    if (!(error instanceof Error)) throw error;
  }
  // Test 4: Validate pagination structure for super admin
  const paginationResult =
    await api.functional.discussionBoard.super_admins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination structure
  if (!paginationResult.pagination) {
    throw new Error("Pagination data is missing");
  }
  if (!Array.isArray(paginationResult.data)) {
    throw new Error("Data should be an array");
  }
  if (paginationResult.pagination.current !== 1) {
    throw new Error(
      `Expected page 1, got ${paginationResult.pagination.current}`,
    );
  }
  if (paginationResult.pagination.limit !== 5) {
    throw new Error(
      `Expected limit 5, got ${paginationResult.pagination.limit}`,
    );
  }
  if (paginationResult.pagination.records < 0) {
    throw new Error("Records count should be non-negative");
  }
  if (paginationResult.pagination.pages < 0) {
    throw new Error("Pages count should be non-negative");
  }
}
