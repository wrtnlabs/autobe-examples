import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminProfile";

/**
 * Validate that a newly joined admin can retrieve their own profile.
 *
 * Business context:
 *
 * - When an administrator signs up via POST /auth/admin/join, the backend creates
 *   a shopping_mall_admins record, issues JWT tokens, and automatically
 *   authenticates the connection.
 * - The admin should then be able to call GET
 *   /shoppingMall/admin/admins/{adminId}/profile to see their profile that is
 *   linked to the same admin account.
 *
 * Steps:
 *
 * 1. Join as a new admin using realistic registration data.
 * 2. Assert the authorization payload structure.
 * 3. Call the profile endpoint with the same admin id under the same connection
 *    (token already attached by SDK).
 * 4. Assert the profile structure and its linkage back to the admin
 *    (shopping_mall_admin_id and embedded admin summary).
 * 5. Verify audit fields semantics (created_at/updated_at non-empty, deleted_at
 *    logically not deleted).
 */
export async function test_api_admin_profile_get_self_success(
  connection: api.IConnection,
) {
  // 1. Join as a new admin using realistic registration data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const adminId: string & tags.Format<"uuid"> = authorized.id;

  // Optional: ensure embedded admin summary (if present) is consistent
  if (authorized.admin !== undefined) {
    const summary = authorized.admin;
    typia.assert<IShoppingMallAdmin.ISummary>(summary);

    TestValidator.equals(
      "authorized.admin.id should match top-level authorized.id",
      summary.id,
      adminId,
    );

    TestValidator.equals(
      "authorized.admin.email should match authorized.email",
      summary.email,
      authorized.email,
    );

    TestValidator.equals(
      "authorized.admin.status should match authorized.status",
      summary.status,
      authorized.status,
    );

    TestValidator.equals(
      "authorized.admin.email_verified should match authorized.email_verified",
      summary.email_verified,
      authorized.email_verified,
    );
  }

  // 2. Retrieve the admin profile for the same adminId
  const profile: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.at(connection, {
      adminId,
    });
  typia.assert<IShoppingMallAdminProfile>(profile);

  // 3. Business validations on profile linkage
  TestValidator.equals(
    "profile.shopping_mall_admin_id must equal authorized admin id",
    profile.shopping_mall_admin_id,
    adminId,
  );

  if (profile.admin !== undefined) {
    const profileAdmin = profile.admin;
    typia.assert<IShoppingMallAdmin.ISummary>(profileAdmin);

    TestValidator.equals(
      "profile.admin.id must equal profile.shopping_mall_admin_id",
      profileAdmin.id,
      profile.shopping_mall_admin_id,
    );

    TestValidator.equals(
      "profile.admin.email must equal authorized.email",
      profileAdmin.email,
      authorized.email,
    );

    TestValidator.equals(
      "profile.admin.status must equal authorized.status",
      profileAdmin.status,
      authorized.status,
    );

    TestValidator.equals(
      "profile.admin.email_verified must equal authorized.email_verified",
      profileAdmin.email_verified,
      authorized.email_verified,
    );
  }

  // 4. Audit field semantics
  TestValidator.predicate(
    "profile.created_at should be a non-empty date-time string",
    profile.created_at.length > 0,
  );

  TestValidator.predicate(
    "profile.updated_at should be a non-empty date-time string",
    profile.updated_at.length > 0,
  );

  TestValidator.predicate(
    "profile.deleted_at should be null or undefined (not logically deleted)",
    profile.deleted_at === null || profile.deleted_at === undefined,
  );
}
