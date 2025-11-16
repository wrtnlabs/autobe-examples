import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test filtering administrators by privilege level (admin_level).
 *
 * Creates multiple admin accounts with different privilege levels (super_admin,
 * moderator, support), then authenticates and performs filtered searches by
 * admin_level. Validates that each search returns only admins matching the
 * specified privilege level, ensuring proper role-based filtering for
 * administrative oversight and privilege management workflows.
 *
 * Steps:
 *
 * 1. Create super_admin account
 * 2. Create moderator account
 * 3. Create support account
 * 4. Authenticate as one of the admins
 * 5. Search for super_admin privilege level and verify results
 * 6. Search for moderator privilege level and verify results
 * 7. Search for support privilege level and verify results
 */
export async function test_api_admin_search_by_privilege_level(
  connection: api.IConnection,
) {
  // Step 1: Create super_admin account
  const superAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const superAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: superAdminData,
    });
  typia.assert(superAdmin);

  // Step 2: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "moderator" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const moderator: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 3: Create support account
  const supportData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "support" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const support: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: supportData,
    });
  typia.assert(support);

  // Step 4: Authenticate as super_admin (connection already has token from join)
  // The join operation automatically sets the Authorization header

  // Step 5: Search for super_admin privilege level
  const superAdminSearchRequest = {
    admin_level: "super_admin" as const,
  } satisfies IShoppingMallAdmin.IRequest;

  const superAdminResults: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: superAdminSearchRequest,
    });
  typia.assert(superAdminResults);

  // Verify all results have super_admin privilege level
  TestValidator.predicate(
    "all super_admin search results have super_admin privilege level",
    superAdminResults.data.every(
      (admin) => admin.admin_level === "super_admin",
    ),
  );

  // Verify our created super_admin is in the results
  const foundSuperAdmin = superAdminResults.data.find(
    (admin) => admin.id === superAdmin.id,
  );
  if (foundSuperAdmin) {
    typia.assertGuard(foundSuperAdmin);
    TestValidator.equals(
      "super_admin found in results",
      foundSuperAdmin.id,
      superAdmin.id,
    );
  } else {
    throw new Error("Created super_admin not found in search results");
  }

  // Step 6: Search for moderator privilege level
  const moderatorSearchRequest = {
    admin_level: "moderator" as const,
  } satisfies IShoppingMallAdmin.IRequest;

  const moderatorResults: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: moderatorSearchRequest,
    });
  typia.assert(moderatorResults);

  // Verify all results have moderator privilege level
  TestValidator.predicate(
    "all moderator search results have moderator privilege level",
    moderatorResults.data.every((admin) => admin.admin_level === "moderator"),
  );

  // Verify our created moderator is in the results
  const foundModerator = moderatorResults.data.find(
    (admin) => admin.id === moderator.id,
  );
  if (foundModerator) {
    typia.assertGuard(foundModerator);
    TestValidator.equals(
      "moderator found in results",
      foundModerator.id,
      moderator.id,
    );
  } else {
    throw new Error("Created moderator not found in search results");
  }

  // Step 7: Search for support privilege level
  const supportSearchRequest = {
    admin_level: "support" as const,
  } satisfies IShoppingMallAdmin.IRequest;

  const supportResults: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: supportSearchRequest,
    });
  typia.assert(supportResults);

  // Verify all results have support privilege level
  TestValidator.predicate(
    "all support search results have support privilege level",
    supportResults.data.every((admin) => admin.admin_level === "support"),
  );

  // Verify our created support admin is in the results
  const foundSupport = supportResults.data.find(
    (admin) => admin.id === support.id,
  );
  if (foundSupport) {
    typia.assertGuard(foundSupport);
    TestValidator.equals(
      "support admin found in results",
      foundSupport.id,
      support.id,
    );
  } else {
    throw new Error("Created support admin not found in search results");
  }

  // Additional verification: Ensure filtering excludes other privilege levels
  TestValidator.predicate(
    "super_admin results do not contain moderator",
    !superAdminResults.data.some((admin) => admin.id === moderator.id),
  );

  TestValidator.predicate(
    "super_admin results do not contain support",
    !superAdminResults.data.some((admin) => admin.id === support.id),
  );

  TestValidator.predicate(
    "moderator results do not contain super_admin",
    !moderatorResults.data.some((admin) => admin.id === superAdmin.id),
  );

  TestValidator.predicate(
    "moderator results do not contain support",
    !moderatorResults.data.some((admin) => admin.id === support.id),
  );

  TestValidator.predicate(
    "support results do not contain super_admin",
    !supportResults.data.some((admin) => admin.id === superAdmin.id),
  );

  TestValidator.predicate(
    "support results do not contain moderator",
    !supportResults.data.some((admin) => admin.id === moderator.id),
  );
}
