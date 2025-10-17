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

/**
 * Validate that a thread author can attach an existing canonical tag to their
 * thread, that the association record is active (deleted_at === null), and that
 * repeated identical attach requests behave idempotently (no duplicate active
 * mappings). Note: The test validates idempotency by repeating the identical
 * request and asserting the server returns the same mapping id.
 *
 * Constraint note: The SDK/test environment prohibits direct manipulation of
 * connection.headers (so we cannot set a custom Idempotency-Key header). As a
 * result this test checks idempotency by repeating the same API call and
 * comparing returned mapping ids, which matches the endpoint documentation's
 * expected behavior when clients retry with the same operation semantics.
 */
export async function test_api_thread_tag_attach_by_author(
  connection: api.IConnection,
) {
  // 1. Administrator joins (SDK stores auth token automatically)
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPass1234",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates a category
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: `cat-${RandomGenerator.alphaNumeric(8)}`,
          slug: `cat-${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Admin creates a canonical tag
  const tag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: {
          name: `tag-${RandomGenerator.alphaNumeric(8)}`,
          slug: `tag-${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconPoliticalForumTag.ICreate,
      },
    );
  typia.assert(tag);

  // 4. Registered user (author) joins
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "AuthorPass1234",
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 5. Author creates a thread (omit optional status to avoid relying on domain enums)
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: `thr-${RandomGenerator.alphaNumeric(10)}`.toLowerCase(),
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 6. Author attaches tag to thread
  const firstMapping: IEconPoliticalForumThreadTag =
    await api.functional.econPoliticalForum.registeredUser.threads.tags.create(
      connection,
      {
        threadId: thread.id,
        body: {
          thread_id: thread.id,
          tag_id: tag.id,
        } satisfies IEconPoliticalForumThreadTag.ICreate,
      },
    );
  typia.assert(firstMapping);

  // Business assertions about mapping
  TestValidator.equals(
    "mapping.thread_id equals thread.id",
    firstMapping.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "mapping.tag_id equals tag.id",
    firstMapping.tag_id,
    tag.id,
  );
  TestValidator.predicate(
    "mapping.deleted_at is null (active)",
    firstMapping.deleted_at === null || firstMapping.deleted_at === undefined,
  );

  // 7. Idempotency: repeat the same attach request and expect no duplicate active mapping.
  // Note: We cannot set Idempotency-Key header here (forbidden), so we validate
  // idempotency by asserting the server returns the same mapping id for the
  // repeated request per endpoint contract.
  const secondMapping: IEconPoliticalForumThreadTag =
    await api.functional.econPoliticalForum.registeredUser.threads.tags.create(
      connection,
      {
        threadId: thread.id,
        body: {
          thread_id: thread.id,
          tag_id: tag.id,
        } satisfies IEconPoliticalForumThreadTag.ICreate,
      },
    );
  typia.assert(secondMapping);

  // Expect identical mapping id on retry (per idempotent contract)
  TestValidator.equals(
    "idempotent mapping id remains same",
    firstMapping.id,
    secondMapping.id,
  );
  TestValidator.equals(
    "idempotent mapping thread_id",
    secondMapping.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "idempotent mapping tag_id",
    secondMapping.tag_id,
    tag.id,
  );
  TestValidator.predicate(
    "second mapping deleted_at is null (active)",
    secondMapping.deleted_at === null || secondMapping.deleted_at === undefined,
  );
}
