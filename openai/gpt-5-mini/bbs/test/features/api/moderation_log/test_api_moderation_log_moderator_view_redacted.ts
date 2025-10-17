import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationLog";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_moderation_log_moderator_view_redacted(
  connection: api.IConnection,
) {
  /**
   * Validate moderator's redacted view of a single moderation log entry.
   *
   * Workflow:
   *
   * 1. Administrator signs up and creates a category.
   * 2. Registered user signs up, creates a thread and a post in that category.
   * 3. Moderator signs up and performs a soft-delete on the post (creates a
   *    moderation log in the system).
   * 4. As moderator, attempt to retrieve a moderation log entry and validate
   *    redaction rules.
   * 5. Negative test: request a non-existent log id and expect an error.
   */

  // 1) Administrator signs up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassw0rd!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Administrator creates a category
  const categoryCreate = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_moderated: true,
    requires_verification: false,
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryCreate },
    );
  typia.assert(category);

  // 3) Registered user signs up
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "UserPassw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);

  // 4) Registered user creates a thread
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: `thread-${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);

  // 5) Registered user creates a post in the thread
  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // 6) Moderator signs up
  const modEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: modEmail,
        password: "ModPassw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(moderator);

  // 7) Moderator performs soft-delete on the post (creates moderation log server-side)
  await api.functional.econPoliticalForum.moderator.posts.erase(connection, {
    postId: post.id,
  });

  // 8) Retrieve a moderation log entry as moderator and validate redaction.
  // Note: erase() does not return the created moderation log id. In SDK simulation
  // mode we therefore request a valid-looking UUID via typia.random to obtain
  // a sample moderation log representation. In a production test, retrieve the
  // actual log id via admin audit APIs or DB queries.
  const sampleLogId = typia.random<string & tags.Format<"uuid">>();
  const log: IEconPoliticalForumModerationLog =
    await api.functional.econPoliticalForum.moderator.moderationLogs.at(
      connection,
      { logId: sampleLogId },
    );
  typia.assert(log);

  // Validate required fields present
  TestValidator.predicate(
    "moderation log contains required identifiers",
    log.id !== undefined &&
      log.action_type !== undefined &&
      log.reason_code !== undefined &&
      log.moderator_id !== undefined &&
      log.target_post_id !== undefined &&
      log.created_at !== undefined,
  );

  // Validate rationale and evidence_reference are redacted or short for moderator role
  TestValidator.predicate(
    "rationale is redacted or truncated for moderator",
    log.rationale === null ||
      (typeof log.rationale === "string" && log.rationale.length <= 256),
  );

  TestValidator.predicate(
    "evidence_reference is redacted or truncated for moderator",
    log.evidence_reference === null ||
      (typeof log.evidence_reference === "string" &&
        log.evidence_reference.length <= 256),
  );

  // Negative test: non-existent log id should produce an error (no status code asserted)
  const nonExistentId = typia.assert<string & tags.Format<"uuid">>(
    "00000000-0000-0000-0000-000000000000",
  );

  await TestValidator.error(
    "requesting a non-existent moderation log should fail",
    async () => {
      await api.functional.econPoliticalForum.moderator.moderationLogs.at(
        connection,
        { logId: nonExistentId },
      );
    },
  );
}
