import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
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

/**
 * Test super admin access control for the administrators list endpoint.
 *
 * Validates that only super admin users can access the administrators list endpoint.
 * Regular admins, members, and unauthenticated requests should be rejected with
 * appropriate HTTP error responses.
 */
export async function test_api_admin_list_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as regular admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  // Create admin account
  const adminAuthorized = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  // Create new connection with admin token
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // Step 2: Regular admin attempts to access admins list - should fail
  await TestValidator.error(
    "regular admin should not access super admin endpoint",
    async () => {
      await api.functional.discussionBoard.superAdmin.admins.index(
        adminAuthConnection,
        {
          body: {},
        },
      );
    },
  );
  // Step 3: Unauthenticated request should also fail
  const publicConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated request should be rejected",
    async () => {
      await api.functional.discussionBoard.superAdmin.admins.index(
        publicConnection,
        {
          body: {},
        },
      );
    },
  );
  // Step 4: Register and authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = "1234";
  // Create super admin account
  const superAdminAuthorized =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: superAdminEmail,
          password: superAdminPassword,
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  // Create new connection with super admin token
  const superAdminAuthConnection: api.IConnection = { host: connection.host };
  superAdminAuthConnection.headers = {
    Authorization: superAdminAuthorized.token.access,
  };
  // Step 5: Super admin should successfully access admins list
  const result: IPageIDiscussionBoardAdmin.ISummary =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminAuthConnection,
      {
        body: {
          isActive: true,
          isSuperAdmin: false,
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(result);
  // Verify the result has expected structure
  TestValidator.predicate(
    "has pagination info",
    () => result.pagination !== undefined,
  );
  TestValidator.predicate("has data array", () => Array.isArray(result.data));
}
