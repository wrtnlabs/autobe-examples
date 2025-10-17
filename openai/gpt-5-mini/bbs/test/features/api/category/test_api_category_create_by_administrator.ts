import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_category_create_by_administrator(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Register an administrator account, obtain authorization, then create a new
   *   forum category. Validate returned category fields and basic
   *   authorization/business invariants.
   */

  // 1) Administrator sign-up (obtain authorization)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1).toLowerCase(),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(adminAuth);

  // By SDK contract, join() injects Authorization into connection.headers.

  // 2) Prepare category creation request
  const createBody = {
    code: null,
    name: `Economics & Policy - ${RandomGenerator.paragraph({ sentences: 2 })}`,
    slug: `economics-policy-${RandomGenerator.alphaNumeric(6)}`,
    description: "Discussions on economic and public policy.",
    is_moderated: true,
    requires_verification: true,
    order: 10,
  } satisfies IEconPoliticalForumCategory.ICreate;

  // 3) Create category as administrator
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: createBody },
    );
  typia.assert(category);

  // 4) Business validations
  TestValidator.equals(
    "created category name matches",
    category.name,
    createBody.name,
  );
  TestValidator.equals(
    "created category slug matches",
    category.slug,
    createBody.slug,
  );
  TestValidator.equals(
    "created category is_moderated matches",
    category.is_moderated,
    createBody.is_moderated,
  );
  TestValidator.equals(
    "created category requires_verification matches",
    category.requires_verification,
    createBody.requires_verification,
  );
  TestValidator.equals(
    "created category order matches",
    category.order,
    createBody.order,
  );

  // created_at and updated_at must be present and non-null (typia.assert already checks types)
  TestValidator.predicate(
    "created_at present",
    category.created_at !== null && category.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at present",
    category.updated_at !== null && category.updated_at !== undefined,
  );

  // deleted_at should be null or undefined (not soft-deleted)
  TestValidator.predicate(
    "category not soft-deleted",
    category.deleted_at === null || category.deleted_at === undefined,
  );

  // 5) Authorization negative test: unauthenticated caller must be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create category",
    async () => {
      await api.functional.econPoliticalForum.administrator.categories.create(
        unauthConn,
        {
          body: {
            code: null,
            name: `Should Fail - ${RandomGenerator.paragraph({ sentences: 1 })}`,
            slug: `unauth-create-${RandomGenerator.alphaNumeric(6)}`,
            description: null,
            is_moderated: false,
            requires_verification: false,
            order: 99,
          } satisfies IEconPoliticalForumCategory.ICreate,
        },
      );
    },
  );

  // 6) Business rule: duplicate slug must be rejected
  await TestValidator.error("duplicate slug should be rejected", async () => {
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: createBody }, // reuse same slug to provoke unique constraint
    );
  });

  // NOTE: Cleanup (deleting the created category) is environment-specific and
  // is expected to be handled by test harness teardown or a dedicated admin
  // delete endpoint. This test logs the created category ID for potential
  // external cleanup.
  // Created category id: category.id
}
