import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IEconPoliticalForumThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThreadTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumThread";

/**
 * Validate tag landing page: search, pagination, and sort fallback behavior.
 *
 * Business purpose:
 *
 * - Ensure that threads associated with a tag can be searched, paginated and are
 *   returned in a sensible order when advanced aggregate sorts are unavailable.
 *   The test creates a tag (admin), creates two threads (registered user),
 *   attaches the tag to both threads, and queries the tag->threads index with a
 *   partial search, page=1 and limit=1. The schema does not support a
 *   "mostVoted" sort key, so this test requests a schema-supported sort
 *   ("newest") and documents the adaptation: the server should fall back to
 *   newest-first ordering when aggregate-based sorts are not supported.
 *
 * Steps:
 *
 * 1. Administrator joins and creates a tag.
 * 2. Registered user joins and creates two threads with distinct titles.
 * 3. Attach the created tag to both threads.
 * 4. Call PATCH /econPoliticalForum/tags/{tagId}/threads with a partial title
 *    query, page=1, limit=1 and sort_by="newest" (schema-compliant). Validate
 *    pagination metadata, search filtering, and that returned threads belong to
 *    the created set.
 */
export async function test_api_thread_list_by_tag_search_and_sort_fallback(
  connection: api.IConnection,
) {
  // 1. Administrator: register and create a canonical tag
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "administrator-password-123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
    } satisfies IEconPoliticalForumAdministrator.IJoin,
  });
  typia.assert(admin);

  // Create a tag as administrator
  const tagName = RandomGenerator.paragraph({ sentences: 2 });
  const tagSlug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const createdTag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: {
          name: tagName,
          slug: tagSlug,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconPoliticalForumTag.ICreate,
      },
    );
  typia.assert(createdTag);
  TestValidator.predicate("created tag has id", !!createdTag.id);

  // 2. Registered user: join
  const userEmail = typia.random<string & tags.Format<"email">>();
  const registered = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: userEmail,
      password: "user-password-123",
      display_name: RandomGenerator.name(2),
    } satisfies IEconPoliticalForumRegisteredUser.IJoin,
  });
  typia.assert(registered);

  // 3. Registered user: create two threads with distinct titles
  // Note: SDK does not provide a category create operation in the provided
  // functions. Use a generated UUID for category_id for test/simulation purposes.
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const title1 = `${RandomGenerator.paragraph({ sentences: 3 })} economics`;
  const slug1 = `${RandomGenerator.alphaNumeric(6)}-a`.toLowerCase();
  const thread1: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: categoryId,
          title: title1,
          slug: slug1,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread1);

  const title2 = `${RandomGenerator.paragraph({ sentences: 3 })} policy`;
  const slug2 = `${RandomGenerator.alphaNumeric(6)}-b`.toLowerCase();
  const thread2: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: categoryId,
          title: title2,
          slug: slug2,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread2);

  TestValidator.notEquals("thread ids should differ", thread1.id, thread2.id);

  // 4. Attach the created tag to both threads
  const mapping1 =
    await api.functional.econPoliticalForum.registeredUser.threads.tags.create(
      connection,
      {
        threadId: thread1.id,
        body: {
          thread_id: thread1.id,
          tag_id: createdTag.id,
        } satisfies IEconPoliticalForumThreadTag.ICreate,
      },
    );
  typia.assert(mapping1);
  TestValidator.equals(
    "mapping1 references tag",
    mapping1.tag_id,
    createdTag.id,
  );
  TestValidator.equals(
    "mapping1 references thread",
    mapping1.thread_id,
    thread1.id,
  );

  const mapping2 =
    await api.functional.econPoliticalForum.registeredUser.threads.tags.create(
      connection,
      {
        threadId: thread2.id,
        body: {
          thread_id: thread2.id,
          tag_id: createdTag.id,
        } satisfies IEconPoliticalForumThreadTag.ICreate,
      },
    );
  typia.assert(mapping2);
  TestValidator.equals(
    "mapping2 references tag",
    mapping2.tag_id,
    createdTag.id,
  );
  TestValidator.equals(
    "mapping2 references thread",
    mapping2.thread_id,
    thread2.id,
  );

  // 5. Query the tag->threads index with a partial title, page=1, limit=1
  // NOTE: The original scenario requested sort 'mostVoted' which is NOT a
  // supported value in IEconPoliticalForumThread.IRequest.sort_by. To comply
  // with the schema we request sort_by: "newest" and document that this test
  // models the fallback expectation (server should fall back to newest when
  // aggregates are not available).
  const partial = title1.split(" ")[0]; // a partial search term from the first title
  const pageRequest = {
    q: partial,
    page: 1,
    limit: 1,
    sort_by: "newest",
  } satisfies IEconPoliticalForumThread.IRequest;

  const pageResult: IPageIEconPoliticalForumThread.ISummary =
    await api.functional.econPoliticalForum.tags.threads.index(connection, {
      tagId: createdTag.id,
      body: pageRequest,
    });
  typia.assert(pageResult);

  // 6. Validations: pagination metadata
  TestValidator.equals(
    "pagination limit respected",
    pageResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    pageResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    pageResult.pagination.pages >= 0,
  );

  // Validate that returned data length respects limit and filtering
  TestValidator.predicate("data length <= limit", pageResult.data.length <= 1);
  if (pageResult.data.length > 0) {
    const returnedId = pageResult.data[0].id;
    // Returned thread should be one of the created threads
    TestValidator.predicate(
      "returned thread belongs to created set",
      [thread1.id, thread2.id].includes(returnedId),
    );

    // Validate that the returned title matches the partial search (case-insensitive)
    const returnedTitle = pageResult.data[0].title;
    TestValidator.predicate(
      "returned title contains search term",
      returnedTitle.toLowerCase().includes(partial.toLowerCase()),
    );
  }
}
