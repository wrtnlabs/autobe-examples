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

/**
 * Validate moderator soft-deletes a thread->tag mapping and that the mapping
 * can be reactivated by re-creating it (observable side-effect used because no
 * direct moderation/audit read endpoints are available in SDK).
 *
 * Workflow:
 *
 * 1. Administrator registers and creates category & tag
 * 2. Registered user registers, creates a thread, and attaches the tag
 * 3. Moderator registers and erases (soft-deletes) the thread->tag mapping
 * 4. Registered user (using preserved token) re-creates the mapping; expect
 *    returned mapping to be active (deleted_at null) indicating reactivation
 *
 * Validations:
 *
 * - All API calls awaited
 * - Typia.assert() used for non-void responses
 * - TestValidator used for business assertions
 */
export async function test_api_thread_tag_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1) Administrator: join and create category + tag
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "admin-password-123",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: `cat-${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 })}`,
          slug: `cat-${RandomGenerator.alphabets(6)}`,
          description: "Test category for moderator tag erase flow",
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  const tag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: {
          name: `tag-${RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 })}`,
          slug: `tag-${RandomGenerator.alphabets(6)}`,
          description: "Test tag for moderator erase flow",
        } satisfies IEconPoliticalForumTag.ICreate,
      },
    );
  typia.assert(tag);

  // 2) Registered user: join, create thread, attach tag
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: userEmail,
        password: "user-password-123",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);

  // Preserve the registered user's token so we can perform post-erase requests
  const userConn: api.IConnection = {
    ...connection,
    headers: { Authorization: user.token.access },
  };

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userConn,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: `thread-${RandomGenerator.alphabets(8)}`,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);
  TestValidator.equals(
    "thread created in proper category",
    thread.category_id,
    category.id,
  );

  const mapping: IEconPoliticalForumThreadTag =
    await api.functional.econPoliticalForum.registeredUser.threads.tags.create(
      userConn,
      {
        threadId: thread.id,
        body: {
          thread_id: thread.id,
          tag_id: tag.id,
        } satisfies IEconPoliticalForumThreadTag.ICreate,
      },
    );
  typia.assert(mapping);
  TestValidator.predicate(
    "initial mapping is active (deleted_at is null or undefined)",
    mapping.deleted_at === null || mapping.deleted_at === undefined,
  );
  TestValidator.equals(
    "mapping references thread",
    mapping.thread_id,
    thread.id,
  );
  TestValidator.equals("mapping references tag", mapping.tag_id, tag.id);

  // 3) Moderator: join and erase mapping
  const modEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: `mod_${RandomGenerator.alphaNumeric(6)}`,
        email: modEmail,
        password: "mod-password-123",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(moderator);

  // Build a moderator-scoped connection to avoid mutating global connection state
  const modConn: api.IConnection = {
    ...connection,
    headers: { Authorization: moderator.token.access },
  };

  // Perform the erase (soft-delete). erase returns void on success.
  await api.functional.econPoliticalForum.moderator.threads.tags.erase(
    modConn,
    {
      threadId: thread.id,
      tagId: tag.id,
    },
  );

  // 4) Use preserved userConn (original author) to attempt re-creating the mapping
  // Attempt to create the mapping again - server should return active mapping
  const mappingAfterErase: IEconPoliticalForumThreadTag =
    await api.functional.econPoliticalForum.registeredUser.threads.tags.create(
      userConn,
      {
        threadId: thread.id,
        body: {
          thread_id: thread.id,
          tag_id: tag.id,
        } satisfies IEconPoliticalForumThreadTag.ICreate,
      },
    );
  typia.assert(mappingAfterErase);

  TestValidator.equals(
    "mapping reactivated references same thread",
    mappingAfterErase.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "mapping reactivated references same tag",
    mappingAfterErase.tag_id,
    tag.id,
  );
  TestValidator.predicate(
    "mapping reactivated is active (deleted_at is null or undefined)",
    mappingAfterErase.deleted_at === null ||
      mappingAfterErase.deleted_at === undefined,
  );

  // NOTE: Direct verification of moderation and audit log entries cannot be
  // performed because no read endpoints are provided for moderation/audit
  // tables in the SDK. Recommend adding admin/moderator read endpoints for
  // econ_political_forum_moderation_logs and econ_political_forum_audit_logs to
  // assert logged entries in a future enhancement.
}
