import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Validate retrieval of report category details by ID for reporting UI.
 *
 * This test verifies that any client (guest or authenticated) can retrieve the
 * full metadata for a specific report category using its unique UUID. It
 * ensures that the name, allow_free_text, created_at, and updated_at fields are
 * returned and accurate. It also tests error scenarios: requesting an
 * unknown/non-existent UUID returns an error rather than empty or dummy data.
 *
 * Steps:
 *
 * 1. Join as admin to authorize category creation.
 * 2. Create a report category (admin only).
 * 3. Retrieve category details by ID as authenticated admin. Validate types,
 *    values, and all returned fields.
 * 4. Retrieve same category details by ID as guest (public unauthenticated).
 *    Validate equivalence to admin response.
 * 5. Negative test: attempt to retrieve category with random UUID; confirm error
 *    is raised.
 * 6. Confirm result can be displayed correctly in reporting UIs (metadata,
 *    free-text allowance, etc.) and used for input validation.
 */
export async function test_api_report_category_details_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin join (setup for category creation)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a new report category (admin-only)
  const createReq = {
    name: `Abuse ${RandomGenerator.alphabets(8)}`,
    allow_free_text: RandomGenerator.pick([true, false]),
  } satisfies ICommunityPlatformReportCategory.ICreate;
  const category =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: createReq,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "created category name matches",
    category.name,
    createReq.name,
  );
  TestValidator.equals(
    "allow_free_text flag matches",
    category.allow_free_text,
    createReq.allow_free_text,
  );

  // 3. Retrieve category by ID as logged-in admin
  const getByIdAdmin =
    await api.functional.communityPlatform.reportCategories.at(connection, {
      reportCategoryId: category.id,
    });
  typia.assert(getByIdAdmin);
  TestValidator.equals(
    "admin retrieve: all fields match",
    getByIdAdmin,
    category,
    (k) => ["updated_at"].includes(k),
  );

  // 4. Retrieve category by ID as guest (unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const getByIdGuest =
    await api.functional.communityPlatform.reportCategories.at(unauthConn, {
      reportCategoryId: category.id,
    });
  typia.assert(getByIdGuest);
  TestValidator.equals(
    "guest retrieve: data equals admin response",
    getByIdGuest,
    getByIdAdmin,
  );

  // 5. Negative: attempt to get details using a random (non-existent) UUID
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "unknown reportCategoryId returns error",
    async () => {
      await api.functional.communityPlatform.reportCategories.at(connection, {
        reportCategoryId: randomId,
      });
    },
  );

  // 6. Validate returned object contains all UI metadata: id, name, allow_free_text, created_at, updated_at
  TestValidator.predicate(
    "category contains all required fields",
    typeof getByIdGuest.id === "string" &&
      typeof getByIdGuest.name === "string" &&
      typeof getByIdGuest.allow_free_text === "boolean" &&
      typeof getByIdGuest.created_at === "string" &&
      typeof getByIdGuest.updated_at === "string",
  );
}
