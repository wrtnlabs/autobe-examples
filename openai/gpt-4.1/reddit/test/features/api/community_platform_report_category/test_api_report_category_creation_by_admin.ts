import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Test the creation of a new report category by an authenticated admin. This
 * covers:
 *
 * 1. Admin onboarding (registration)
 * 2. Successful creation of a unique report category (e.g., 'Harassment')
 * 3. Validation that the returned category fields are present and correct
 * 4. Edge case: attempt to create same category again and assert error.
 * 5. Ensure only admins (authenticated) can create (non-admin/unauth = error).
 * 6. (Field validation) Input an empty name to get error.
 */
export async function test_api_report_category_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin onboarding/registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new unique report category
  const categoryName: string = RandomGenerator.paragraph({ sentences: 2 }); // e.g., "Harassment Report"
  const categoryBody = {
    name: categoryName,
    allow_free_text: true,
  } satisfies ICommunityPlatformReportCategory.ICreate;

  const created: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(created);

  // 3. Validation: values, correct fields
  TestValidator.equals(
    "category name matches input",
    created.name,
    categoryBody.name,
  );
  TestValidator.equals(
    "allow_free_text matches input",
    created.allow_free_text,
    true,
  );

  // 4. Edge case: duplicate creation (same name) must fail
  await TestValidator.error("duplicate name is rejected", async () => {
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  });

  // 5. Only admins can create: try as unauthenticated caller
  // Simulate non-admin by resetting connection headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot create category", async () => {
    await api.functional.communityPlatform.admin.reportCategories.create(
      unauthConn,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          allow_free_text: false,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  });

  // 6. Field validation: empty name string triggers error
  await TestValidator.error("empty name rejected", async () => {
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: "",
          allow_free_text: false,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  });
}
