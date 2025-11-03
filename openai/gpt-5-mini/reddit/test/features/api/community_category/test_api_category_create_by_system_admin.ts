import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityCategory";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_category_create_by_system_admin(
  connection: api.IConnection,
) {
  /**
   * E2E: System-admin category creation workflow
   *
   * Verifies:
   *
   * - Admin provisioning (POST /auth/systemAdmin/join)
   * - Category creation with unique code
   * - Duplicate-code rejection (409-like behavior)
   * - Parent assignment via parent_code
   * - Error when assigning non-existent parent
   * - Unauthorized creation is rejected for unauthenticated callers
   * - Audit linkage: created_by.id equals acting admin id when present
   */

  // 1) Provision a fresh system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Passw0rd!"; // meets DTO password pattern requirements

  const adminAuth: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
      } satisfies ICommunityBbsSystemAdmin.ICreate,
    });
  typia.assert(adminAuth);
  const adminId: string = adminAuth.id;

  // 2) Create a top-level category with unique code
  const parentCode = `test-cat-${Date.now()}`;
  const createParentBody = {
    code: parentCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    display_order: 0,
  } satisfies ICommunityBbsCommunityCategory.ICreate;

  const parentCategory: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.systemAdmin.categories.create(
      connection,
      {
        body: createParentBody,
      },
    );
  typia.assert(parentCategory);

  TestValidator.equals(
    "created category code matches request",
    parentCategory.code,
    parentCode,
  );

  // Audit linkage: when created_by is present, it should match the acting admin
  if (
    parentCategory.created_by !== null &&
    parentCategory.created_by !== undefined
  ) {
    TestValidator.equals(
      "category.created_by matches acting admin",
      parentCategory.created_by.id,
      adminId,
    );
  } else {
    // Not all implementations return created_by; assert predictable null/undefined
    TestValidator.predicate(
      "category.created_by is null or omitted",
      parentCategory.created_by === null ||
        parentCategory.created_by === undefined,
    );
  }

  // Confirm soft-delete is not set on newly created record
  TestValidator.equals(
    "category.deleted_at is null",
    parentCategory.deleted_at,
    null,
  );

  // 3) Duplicate code should be rejected (business error)
  await TestValidator.error(
    "creating duplicate category code should fail",
    async () => {
      await api.functional.communityBbs.systemAdmin.categories.create(
        connection,
        {
          body: createParentBody,
        },
      );
    },
  );

  // 4) Create a child category referencing parent_code
  const childCode = `${parentCode}-child`;
  const createChildBody = {
    code: childCode,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    parent_code: parentCode,
    display_order: 1,
  } satisfies ICommunityBbsCommunityCategory.ICreate;

  const childCategory: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.systemAdmin.categories.create(
      connection,
      {
        body: createChildBody,
      },
    );
  typia.assert(childCategory);

  TestValidator.predicate(
    "child category parent exists",
    childCategory.parent !== null && childCategory.parent !== undefined,
  );
  if (childCategory.parent) {
    TestValidator.equals(
      "child's parent code matches parent category",
      childCategory.parent.code,
      parentCode,
    );
  }

  // 5) Creating with a non-existent parent_code should fail
  const fakeParentCode = `no-such-parent-${Date.now()}`;
  await TestValidator.error(
    "assigning non-existent parent_code should fail",
    async () => {
      await api.functional.communityBbs.systemAdmin.categories.create(
        connection,
        {
          body: {
            code: `invalid-parent-${Date.now()}`,
            title: "Invalid Parent Test",
            parent_code: fakeParentCode,
            display_order: 99,
          } satisfies ICommunityBbsCommunityCategory.ICreate,
        },
      );
    },
  );

  // 6) Unauthenticated caller must not be able to create a category
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated caller cannot create category",
    async () => {
      await api.functional.communityBbs.systemAdmin.categories.create(
        unauthConn,
        {
          body: {
            code: `unauth-${Date.now()}`,
            title: "Should Fail",
            display_order: 0,
          } satisfies ICommunityBbsCommunityCategory.ICreate,
        },
      );
    },
  );

  // Note: Test for non-admin token rejection is skipped because the SDK does not
  // expose non-admin authentication endpoints in the provided materials. The
  // unauthenticated check validates basic auth enforcement.
}
