import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityCategory";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_category_soft_delete_by_system_admin(
  connection: api.IConnection,
) {
  /**
   * Test: Soft-delete a community category as a system administrator.
   *
   * Steps implemented:
   *
   * 1. Create a system admin via POST /auth/systemAdmin/join
   * 2. Create a category via POST /communityBbs/systemAdmin/categories
   * 3. Delete that category via DELETE
   *    /communityBbs/systemAdmin/categories/:categoryCode
   * 4. Assert the erase call succeeded (no exception) and that a subsequent erase
   *    attempt fails (indicating the category was removed/soft-deleted).
   *
   * Note: The original scenario asked to verify deleted_at, public GET, and
   * audit logs. Those endpoints were not available in the provided SDK
   * materials, so this test verifies behavior using the available API surface
   * (successful erase and error on repeated erase).
   */

  // 1) Create system administrator account and obtain authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      // Password meets requirements: min 8, at least one lowercase, one uppercase, one digit
      password: "Passw0rd1",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityBbsSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // SDK's join() sets connection.headers.Authorization automatically; subsequent calls are authenticated

  // 2) Create a category to delete
  const categoryCode = `test-category-delete-${Date.now()}`;
  const createBody = {
    code: categoryCode,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 6,
      wordMax: 12,
    }),
  } satisfies ICommunityBbsCommunityCategory.ICreate;

  const created: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.systemAdmin.categories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created category code matches request",
    created.code,
    categoryCode,
  );

  // 3) Perform soft-delete (erase)
  await api.functional.communityBbs.systemAdmin.categories.erase(connection, {
    categoryCode,
  });

  // 4) Subsequent deletion attempt should fail (category already deleted or not found)
  await TestValidator.error(
    "deleting the same category again should fail",
    async () => {
      await api.functional.communityBbs.systemAdmin.categories.erase(
        connection,
        {
          categoryCode,
        },
      );
    },
  );
}
