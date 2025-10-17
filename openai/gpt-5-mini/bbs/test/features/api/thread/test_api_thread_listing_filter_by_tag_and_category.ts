import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IEconPoliticalForumThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThreadTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumThread";

export async function test_api_thread_listing_filter_by_tag_and_category(
  connection: api.IConnection,
) {
  /**
   * E2E Test: Verify threads listing honors category and tag filters.
   *
   * Steps implemented:
   *
   * 1. Administrator registers (administrator.join)
   * 2. Administrator creates a category (administrator.categories.create)
   * 3. Administrator creates a tag (administrator.tags.create)
   * 4. Registered user registers (registeredUser.join)
   * 5. Registered user creates a thread in the created category
   *    (registeredUser.threads.create)
   * 6. Registered user attaches the tag to the thread
   *    (registeredUser.threads.tags.create)
   * 7. Call threads.index with { tag_id, category_id } and assert the created
   *    thread is present
   */

  // 1) Administrator join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass#2025", // >= 10 chars as required by admin DTO
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(adminAuth);

  // 2) Create category (admin)
  const categoryCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`.toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3) Create tag (admin)
  const tagCreateBody = {
    name: `tag-${RandomGenerator.alphaNumeric(6)}`.toLowerCase(),
    slug: `tag-${RandomGenerator.alphaNumeric(6)}`.toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IEconPoliticalForumTag.ICreate;

  const tag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      { body: tagCreateBody },
    );
  typia.assert(tag);

  // 4) Registered user join
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userAuth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "UserPass#2025",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userAuth);

  // 5) Create thread as registered user
  const slug = `thr-${RandomGenerator.alphaNumeric(6)}`;
  const threadCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    slug,
    status: "open",
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadCreateBody },
    );
  typia.assert(thread);

  // 6) Attach tag to thread
  const mappingCreateBody = {
    thread_id: thread.id,
    tag_id: tag.id,
  } satisfies IEconPoliticalForumThreadTag.ICreate;

  const mapping: IEconPoliticalForumThreadTag =
    await api.functional.econPoliticalForum.registeredUser.threads.tags.create(
      connection,
      {
        threadId: thread.id,
        body: mappingCreateBody,
      },
    );
  typia.assert(mapping);

  // 7) Query threads index with filters { tag_id, category_id }
  const searchBody = {
    tag_id: tag.id,
    category_id: category.id,
    page: 1,
    limit: 20,
    sort_by: "newest",
    order: "desc",
  } satisfies IEconPoliticalForumThread.IRequest;

  const page: IPageIEconPoliticalForumThread.ISummary =
    await api.functional.econPoliticalForum.threads.index(connection, {
      body: searchBody,
    });
  typia.assert(page);

  // Validate that the created thread is included in the results
  TestValidator.predicate(
    "thread listing includes created thread when filtered by tag and category",
    page.data.some((t) => t.id === thread.id),
  );
}
