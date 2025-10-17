import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_thread_creation_by_registered_user_with_category_validation(
  connection: api.IConnection,
) {
  // 1. Administrator joins (to create categories)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Create a category that does NOT require verification
  const categorySlug = `e2e-${RandomGenerator.alphaNumeric(6)}`;
  const category =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: "E2E Category",
          slug: categorySlug,
          description: "Category for E2E testing",
          is_moderated: false,
          requires_verification: false,
          order: 100,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Registered user joins
  const userEmail = typia.random<string & tags.Format<"email">>();
  const registered = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: `e2e_user_${RandomGenerator.alphaNumeric(6)}`,
      email: userEmail,
      password: "UserPass123",
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumRegisteredUser.IJoin,
  });
  typia.assert(registered);

  // 4. Registered user creates a thread in the created category
  const threadSlug = `test-thread-${RandomGenerator.alphaNumeric(6)}`;
  const thread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: threadSlug,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5. Basic business assertions
  TestValidator.equals(
    "thread belongs to created category",
    thread.category_id,
    category.id,
  );
  TestValidator.equals(
    "thread author matches registered user",
    thread.author_id,
    registered.id,
  );
  TestValidator.equals("thread not soft-deleted", thread.deleted_at, null);

  // 6. Duplicate slug should fail (attempt to create another thread with same slug)
  await TestValidator.error("duplicate slug should fail", async () => {
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: "Duplicate slug attempt",
          slug: threadSlug,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  });

  // 7. Create a category that requires verification and assert gating
  const gatedSlug = `gated-${RandomGenerator.alphaNumeric(6)}`;
  const gatedCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: "Gated Category",
          slug: gatedSlug,
          description: "Requires verified accounts to post",
          is_moderated: false,
          requires_verification: true,
          order: 200,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(gatedCategory);

  // Attempt to create in gated category with unverified user -> should fail
  await TestValidator.error(
    "unverified user cannot post in verification-gated category",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.threads.create(
        connection,
        {
          body: {
            category_id: gatedCategory.id,
            title: "Should be forbidden",
            slug: `gated-thread-${RandomGenerator.alphaNumeric(6)}`,
          } satisfies IEconPoliticalForumThread.ICreate,
        },
      );
    },
  );

  // Note: Sanitization/content-body tests are skipped because IEconPoliticalForumThread.ICreate
  // does not include a post body/content field in provided DTOs.

  // Teardown: rely on test isolation and unique slugs; no admin delete API available in provided SDK.
}
