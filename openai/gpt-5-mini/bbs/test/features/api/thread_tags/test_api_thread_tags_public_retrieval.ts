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
import type { IPageIEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumTag";

export async function test_api_thread_tags_public_retrieval(
  connection: api.IConnection,
) {
  /**
   * Purpose: Verify that a canonical tag can be created by an administrator,
   * attached to a thread by the thread's author, and that the resulting mapping
   * and tag records expose the public fields (id, name, slug) and an active
   * (non-soft-deleted) mapping row.
   *
   * Note: The SDK does not provide a GET listing endpoint for thread tags.
   * Therefore this test validates the public contract by asserting the
   * responses from create operations (which reflect the public DTO shapes) and
   * the created mapping record.
   */

  // 1) Administrator: join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPass1234", // meets minLength<10>
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2) Admin: create category
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_moderated: false,
    requires_verification: false,
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const createdCategory: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(createdCategory);

  // 3) Admin: create canonical tag
  const tagBody = {
    name: `tag-${RandomGenerator.alphaNumeric(6)}`,
    slug: `tag-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IEconPoliticalForumTag.ICreate;

  const createdTag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      { body: tagBody },
    );
  typia.assert(createdTag);

  // Basic assertions about the created tag (public fields exist)
  TestValidator.equals(
    "created tag name matches request",
    createdTag.name,
    tagBody.name,
  );
  TestValidator.equals(
    "created tag slug matches request",
    createdTag.slug,
    tagBody.slug,
  );

  // 4) Author: register (joins switches authorization token in connection)
  const authorEmail: string = typia.random<string & tags.Format<"email">>();
  const authorJoinBody = {
    username: RandomGenerator.name(1),
    email: authorEmail,
    password: "UserPass1234",
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: authorJoinBody,
    });
  typia.assert(author);

  // 5) Author: create thread
  const threadBody = {
    category_id: createdCategory.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: `thread-${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const createdThread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(createdThread);

  TestValidator.equals(
    "thread category matches",
    createdThread.category_id,
    createdCategory.id,
  );

  // 6) Author: attach tag to the thread
  const mappingBody = {
    thread_id: createdThread.id,
    tag_id: createdTag.id,
  } satisfies IEconPoliticalForumThreadTag.ICreate;

  const mapping: IEconPoliticalForumThreadTag =
    await api.functional.econPoliticalForum.registeredUser.threads.tags.create(
      connection,
      {
        threadId: createdThread.id,
        body: mappingBody,
      },
    );
  typia.assert(mapping);

  // 7) Business assertions validating public contract
  TestValidator.equals(
    "mapping references correct thread",
    mapping.thread_id,
    createdThread.id,
  );
  TestValidator.equals(
    "mapping references correct tag",
    mapping.tag_id,
    createdTag.id,
  );

  // Ensure mapping is active (not soft-deleted)
  TestValidator.predicate(
    "mapping must be active (not soft-deleted)",
    mapping.deleted_at === null || mapping.deleted_at === undefined,
  );

  // Because GET listing is not available in provided SDK, we treat the
  // createdTag and mapping responses as the public shapes and ensure they
  // contain the expected public fields only (id/name/slug present and valid).
  typia.assert(createdTag);
  typia.assert(mapping);
}
