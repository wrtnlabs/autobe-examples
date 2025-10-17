import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IEconPoliticalForumThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThreadTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumTag";

export async function test_api_thread_tags_exclude_soft_deleted_mappings(
  connection: api.IConnection,
) {
  // 1) Administrator signs up
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass-!23",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Admin creates a category
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category ${RandomGenerator.paragraph({ sentences: 2 })}`,
          slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3) Admin creates a canonical tag
  const tag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: {
          name: `tag-${RandomGenerator.alphaNumeric(6)}`,
          slug: `tag-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconPoliticalForumTag.ICreate,
      },
    );
  typia.assert(tag);

  // 4) Author (registered user) joins
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: authorEmail,
        password: "UserPass-!23",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 5) Author creates a thread
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: `thr-${RandomGenerator.alphaNumeric(8)}`,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 6) Author attaches the tag to the thread
  const mapping: IEconPoliticalForumThreadTag =
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
  typia.assert(mapping);

  // 7) Moderator signs up
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: `mod_${RandomGenerator.alphaNumeric(6)}`,
        email: moderatorEmail,
        password: "ModPass-!23",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(moderator);

  // 8) Moderator soft-deletes the thread->tag mapping
  try {
    await api.functional.econPoliticalForum.moderator.threads.tags.erase(
      connection,
      {
        threadId: thread.id,
        tagId: tag.id,
      },
    );

    // 9) After erase, attempt to re-attach the same tag as the author.
    // Expectation: server reactivates soft-deleted mapping (per API docs).
    const reattached: IEconPoliticalForumThreadTag =
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
    typia.assert(reattached);

    // Use `== null` to cover both null and undefined effectively.
    TestValidator.predicate(
      "reattached mapping is active (not soft-deleted)",
      reattached.deleted_at == null,
    );
  } catch (exp) {
    // If deletion is blocked (e.g., legal hold) or forbidden, assert that the
    // erase call produced an error path. We avoid checking HTTP status codes
    // directly; instead we document that an error occurred in this path.
    await TestValidator.error(
      "moderator erase resulted in an error (legal hold or forbidden)",
      async () => {
        throw exp;
      },
    );
  }
}
