import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin search with multiple sorting options.
 *
 * This test validates the admin search functionality by creating multiple admin
 * accounts with varied attributes and testing different sorting configurations.
 * It ensures that the search API correctly orders results based on different
 * fields (created_at, email, full_name, admin_level) in both ascending and
 * descending directions.
 *
 * Process:
 *
 * 1. Create multiple admin accounts with diverse attributes
 * 2. Authenticate as the first admin
 * 3. Test sorting by created_at (asc and desc)
 * 4. Test sorting by email (asc and desc)
 * 5. Test sorting by full_name (asc and desc)
 * 6. Test sorting by admin_level (asc and desc)
 * 7. Verify correct ordering for each sort configuration
 */
export async function test_api_admin_search_with_sorting(
  connection: api.IConnection,
) {
  // Create multiple admin accounts with varied attributes for comprehensive sorting validation
  const adminLevels = ["super_admin", "moderator", "support"] as const;
  const adminEmails = [
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com",
    "diana@example.com",
    "eve@example.com",
  ];
  const adminNames = [
    "Alice Smith",
    "Bob Johnson",
    "Charlie Brown",
    "Diana Prince",
    "Eve Taylor",
  ];

  const createdAdmins: IShoppingMallAdmin.IAuthorized[] = [];

  for (let i = 0; i < 5; i++) {
    const adminData = {
      email: adminEmails[i],
      password: "SecurePass123!",
      full_name: adminNames[i],
      phone_number: RandomGenerator.mobile(),
      admin_level: adminLevels[i % 3],
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate;

    const admin = await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
    typia.assert(admin);
    createdAdmins.push(admin);

    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Authenticate as the first admin to perform searches
  const authAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass456!",
      full_name: "Test Admin",
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(authAdmin);

  // Test sorting by created_at ascending
  const sortByCreatedAtAsc =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        sort_by: "created_at",
        order: "asc",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(sortByCreatedAtAsc);

  // Verify ascending order by created_at
  for (let i = 0; i < sortByCreatedAtAsc.data.length - 1; i++) {
    const current = new Date(sortByCreatedAtAsc.data[i].created_at).getTime();
    const next = new Date(sortByCreatedAtAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "created_at ascending order should be maintained",
      current <= next,
    );
  }

  // Test sorting by created_at descending
  const sortByCreatedAtDesc =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        sort_by: "created_at",
        order: "desc",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(sortByCreatedAtDesc);

  // Verify descending order by created_at
  for (let i = 0; i < sortByCreatedAtDesc.data.length - 1; i++) {
    const current = new Date(sortByCreatedAtDesc.data[i].created_at).getTime();
    const next = new Date(sortByCreatedAtDesc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "created_at descending order should be maintained",
      current >= next,
    );
  }

  // Test sorting by email ascending
  const sortByEmailAsc = await api.functional.shoppingMall.admin.admins.index(
    connection,
    {
      body: {
        sort_by: "email",
        order: "asc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(sortByEmailAsc);

  // Verify ascending order by email
  for (let i = 0; i < sortByEmailAsc.data.length - 1; i++) {
    const current = sortByEmailAsc.data[i].email;
    const next = sortByEmailAsc.data[i + 1].email;
    TestValidator.predicate(
      "email ascending order should be maintained",
      current <= next,
    );
  }

  // Test sorting by email descending
  const sortByEmailDesc = await api.functional.shoppingMall.admin.admins.index(
    connection,
    {
      body: {
        sort_by: "email",
        order: "desc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(sortByEmailDesc);

  // Verify descending order by email
  for (let i = 0; i < sortByEmailDesc.data.length - 1; i++) {
    const current = sortByEmailDesc.data[i].email;
    const next = sortByEmailDesc.data[i + 1].email;
    TestValidator.predicate(
      "email descending order should be maintained",
      current >= next,
    );
  }

  // Test sorting by full_name ascending
  const sortByNameAsc = await api.functional.shoppingMall.admin.admins.index(
    connection,
    {
      body: {
        sort_by: "full_name",
        order: "asc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(sortByNameAsc);

  // Verify ascending order by full_name
  for (let i = 0; i < sortByNameAsc.data.length - 1; i++) {
    const current = sortByNameAsc.data[i].full_name;
    const next = sortByNameAsc.data[i + 1].full_name;
    TestValidator.predicate(
      "full_name ascending order should be maintained",
      current <= next,
    );
  }

  // Test sorting by full_name descending
  const sortByNameDesc = await api.functional.shoppingMall.admin.admins.index(
    connection,
    {
      body: {
        sort_by: "full_name",
        order: "desc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(sortByNameDesc);

  // Verify descending order by full_name
  for (let i = 0; i < sortByNameDesc.data.length - 1; i++) {
    const current = sortByNameDesc.data[i].full_name;
    const next = sortByNameDesc.data[i + 1].full_name;
    TestValidator.predicate(
      "full_name descending order should be maintained",
      current >= next,
    );
  }

  // Test sorting by admin_level ascending
  const sortByLevelAsc = await api.functional.shoppingMall.admin.admins.index(
    connection,
    {
      body: {
        sort_by: "admin_level",
        order: "asc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(sortByLevelAsc);

  // Verify ascending order by admin_level
  for (let i = 0; i < sortByLevelAsc.data.length - 1; i++) {
    const current = sortByLevelAsc.data[i].admin_level;
    const next = sortByLevelAsc.data[i + 1].admin_level;
    TestValidator.predicate(
      "admin_level ascending order should be maintained",
      current <= next,
    );
  }

  // Test sorting by admin_level descending
  const sortByLevelDesc = await api.functional.shoppingMall.admin.admins.index(
    connection,
    {
      body: {
        sort_by: "admin_level",
        order: "desc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(sortByLevelDesc);

  // Verify descending order by admin_level
  for (let i = 0; i < sortByLevelDesc.data.length - 1; i++) {
    const current = sortByLevelDesc.data[i].admin_level;
    const next = sortByLevelDesc.data[i + 1].admin_level;
    TestValidator.predicate(
      "admin_level descending order should be maintained",
      current >= next,
    );
  }
}
