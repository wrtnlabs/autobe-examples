import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";

/**
 * Test comprehensive administrator listing functionality with advanced
 * filtering capabilities.
 *
 * This test validates the administrator listing API's ability to filter,
 * search, paginate, and sort administrator accounts based on various criteria
 * including email domain, display name, admin level, super admin status, and
 * temporal attributes.
 */
export async function test_api_admin_listing_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create multiple administrator accounts with varying attributes
  const adminLevels = ["system", "content", "user", "moderation"] as const;
  const createdAdmins: ICommunityPlatformAdmin.IAuthorized[] = [];

  for (let i = 0; i < 8; i++) {
    const adminLevel = RandomGenerator.pick(adminLevels);
    const isSuperAdmin = i % 3 === 0; // Every 3rd admin is super admin

    const admin = await api.functional.auth.admin.join(connection, {
      body: {
        email: `admin${i}@${i % 2 === 0 ? "company" : "organization"}.com`,
        password: `Password${i}!`,
        display_name: `Admin ${RandomGenerator.pick(["John", "Jane", "Mike", "Sarah"])} ${i}`,
        admin_level: adminLevel,
        is_super_admin: isSuperAdmin,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
    typia.assert(admin);
    createdAdmins.push(admin);
  }

  // Step 2: Test basic listing without filters
  const allAdmins = await api.functional.communityPlatform.admin.admins.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(allAdmins);
  TestValidator.predicate(
    "basic listing should return all administrators",
    allAdmins.data.length >= createdAdmins.length,
  );

  // Step 3: Test email domain filtering
  const companyDomainAdmins =
    await api.functional.communityPlatform.admin.admins.index(connection, {
      body: {
        search: "company.com",
      } satisfies ICommunityPlatformAdmin.IRequest,
    });
  typia.assert(companyDomainAdmins);
  TestValidator.predicate(
    "email domain filtering should return matching administrators",
    companyDomainAdmins.data.length > 0 &&
      companyDomainAdmins.data.every((admin) =>
        createdAdmins.some(
          (created) =>
            created.id === admin.id && created.email.includes("company.com"),
        ),
      ),
  );

  // Step 4: Test display name search
  const johnAdmins = await api.functional.communityPlatform.admin.admins.index(
    connection,
    {
      body: {
        search: "John",
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(johnAdmins);

  // Step 5: Test admin level filtering
  const systemAdmins =
    await api.functional.communityPlatform.admin.admins.index(connection, {
      body: {
        admin_level: "system",
      } satisfies ICommunityPlatformAdmin.IRequest,
    });
  typia.assert(systemAdmins);
  TestValidator.predicate(
    "admin level filtering should return matching administrators",
    systemAdmins.data.length > 0 &&
      systemAdmins.data.every((admin) =>
        createdAdmins.some(
          (created) =>
            created.id === admin.id && created.admin_level === "system",
        ),
      ),
  );

  // Step 6: Test super admin status filtering
  const superAdmins = await api.functional.communityPlatform.admin.admins.index(
    connection,
    {
      body: {
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(superAdmins);
  TestValidator.predicate(
    "super admin filtering should return matching administrators",
    superAdmins.data.length > 0 &&
      superAdmins.data.every((admin) =>
        createdAdmins.some(
          (created) =>
            created.id === admin.id && created.is_super_admin === true,
        ),
      ),
  );

  // Step 7: Test pagination
  const firstPage = await api.functional.communityPlatform.admin.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page should have correct number of items",
    firstPage.data.length,
    3,
  );

  const secondPage = await api.functional.communityPlatform.admin.admins.index(
    connection,
    {
      body: {
        page: 2,
        limit: 3,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(secondPage);

  // Step 8: Test sorting by creation date
  const sortedByCreation =
    await api.functional.communityPlatform.admin.admins.index(connection, {
      body: {
        order_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformAdmin.IRequest,
    });
  typia.assert(sortedByCreation);

  // Step 9: Test sorting by display name
  const sortedByName =
    await api.functional.communityPlatform.admin.admins.index(connection, {
      body: {
        order_by: "display_name",
        order: "asc",
      } satisfies ICommunityPlatformAdmin.IRequest,
    });
  typia.assert(sortedByName);

  // Step 10: Test combined filtering
  const combinedFilter =
    await api.functional.communityPlatform.admin.admins.index(connection, {
      body: {
        search: "company.com",
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.IRequest,
    });
  typia.assert(combinedFilter);

  // Step 11: Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata should be valid",
    firstPage.pagination.current === 1 &&
      firstPage.pagination.limit === 3 &&
      firstPage.pagination.records >= createdAdmins.length &&
      firstPage.pagination.pages >= Math.ceil(createdAdmins.length / 3),
  );
}
