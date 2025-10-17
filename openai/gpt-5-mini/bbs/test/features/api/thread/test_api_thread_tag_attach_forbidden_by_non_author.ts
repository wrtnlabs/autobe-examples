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

export async function test_api_thread_tag_attach_forbidden_by_non_author(
  connection: api.IConnection,
) {
  // Use separate connection objects so each join() stores its Authorization
  // token into its own connection.headers without touching the original
  // connection.headers directly (SDK manages header assignment per connection).
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const nonAuthorConn: api.IConnection = { ...connection, headers: {} };
  const authorConn: api.IConnection = { ...connection, headers: {} };

  // 1) Admin: register
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `Adm1nPass-${RandomGenerator.alphaNumeric(6)}`,
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2) Admin: create category
  const categoryBody = {
    code: null,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: null,
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3) Admin: create canonical tag
  const tagBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: null,
  } satisfies IEconPoliticalForumTag.ICreate;
  const tag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      adminConn,
      {
        body: tagBody,
      },
    );
  typia.assert(tag);

  // 4) Create two registered users (non-author and author) on separate connections
  const nonAuthorBody = {
    username: `non_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: `UserPass-${RandomGenerator.alphaNumeric(6)}`,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;
  const nonAuthor: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(nonAuthorConn, {
      body: nonAuthorBody,
    });
  typia.assert(nonAuthor);

  const authorBody = {
    username: `auth_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: `UserPass-${RandomGenerator.alphaNumeric(6)}`,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(authorConn, {
      body: authorBody,
    });
  typia.assert(author);

  // 5) Author: create a thread in the created category
  // Ensure title meets recommended length by generating sufficiently long content
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({
      sentences: 12,
      wordMin: 6,
      wordMax: 10,
    }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
  } satisfies IEconPoliticalForumThread.ICreate;
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      authorConn,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);

  TestValidator.equals(
    "thread created belongs to category",
    thread.category_id,
    category.id,
  );

  // 6) Non-author attempts to attach the tag -> must fail with permission error
  await TestValidator.error(
    "non-author cannot attach tag to someone else's thread",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.threads.tags.create(
        nonAuthorConn,
        {
          threadId: thread.id,
          body: {
            thread_id: thread.id,
            tag_id: tag.id,
          } satisfies IEconPoliticalForumThreadTag.ICreate,
        },
      );
    },
  );

  // 7) Admin attaches the tag successfully to confirm mapping can be created
  const mapping: IEconPoliticalForumThreadTag =
    await api.functional.econPoliticalForum.registeredUser.threads.tags.create(
      adminConn,
      {
        threadId: thread.id,
        body: {
          thread_id: thread.id,
          tag_id: tag.id,
        } satisfies IEconPoliticalForumThreadTag.ICreate,
      },
    );
  typia.assert(mapping);

  TestValidator.equals(
    "mapping.thread_id matches thread",
    mapping.thread_id,
    thread.id,
  );
  TestValidator.equals("mapping.tag_id matches tag", mapping.tag_id, tag.id);
}
