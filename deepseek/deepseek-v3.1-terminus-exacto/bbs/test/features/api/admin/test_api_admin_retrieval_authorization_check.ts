import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_admin_retrieval_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // Create base admin account first
  const baseAdminConnection: api.IConnection = { host: connection.host };
  const baseAdmin = await authorize_admin_join(baseAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(baseAdmin);
  // Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const regularUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(regularUser);
  // Test 1: Regular user attempts to access admin profile (should fail)
  await TestValidator.error(
    "regular user cannot access admin profile",
    async () => {
      await api.functional.discussionBoard.admins.at(userConnection, {
        adminId: baseAdmin.id,
      });
    },
  );
  // Test 2: Admin accesses their own profile (should succeed)
  const adminProfile = await api.functional.discussionBoard.admins.at(
    baseAdminConnection,
    {
      adminId: baseAdmin.id,
    },
  );
  typia.assert(adminProfile);
  TestValidator.equals(
    "admin can access own profile",
    adminProfile.id,
    baseAdmin.id,
  );
  TestValidator.equals(
    "admin email matches",
    adminProfile.email,
    baseAdmin.email,
  );
  // Create another admin account for testing cross-admin access
  const adminConnection2: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(secondAdmin);
  // Test 3: Admin accesses another admin's profile (admin-to-admin access)
  const anotherAdminProfile = await api.functional.discussionBoard.admins.at(
    baseAdminConnection,
    {
      adminId: secondAdmin.id,
    },
  );
  typia.assert(anotherAdminProfile);
  TestValidator.equals(
    "admin can access other admin profiles",
    anotherAdminProfile.id,
    secondAdmin.id,
  );
  TestValidator.equals(
    "admin email matches for cross-access",
    anotherAdminProfile.email,
    secondAdmin.email,
  );
  // Test 4: Verify that deleted_at is null for active admin accounts
  TestValidator.predicate(
    "active admin has null deleted_at",
    adminProfile.deleted_at === null,
  );
  TestValidator.predicate(
    "other active admin has null deleted_at",
    anotherAdminProfile.deleted_at === null,
  );
}
