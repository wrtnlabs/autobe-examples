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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumModerationLog";

export async function test_api_moderation_logs_index_moderator_view(
  connection: api.IConnection,
) {
  // 1) Administrator: register and obtain admin token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass#2025",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // Prepare an unauthenticated connection for creating users (SDK will set tokens on the provided connection)
  const anonConn: api.IConnection = { ...connection, headers: {} };

  // 2) Administrator creates a category
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: `test-category-${RandomGenerator.alphabets(6)}`,
          slug: `test-category-${RandomGenerator.alphabets(6)}`,
          description: null,
          code: null,
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3) Registered user (author) joins
  const userConn: api.IConnection = { ...connection, headers: {} };
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userConn, {
      body: {
        username: `author_${RandomGenerator.alphabets(6)}`,
        email: userEmail,
        password: "UserPass#2025",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);

  // 4) Registered user creates a thread in the category
  const threadTitle = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 12,
  });
  const threadSlug = RandomGenerator.alphabets(8);
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userConn,
      {
        body: {
          category_id: category.id,
          title: threadTitle,
          slug: threadSlug,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5) Optional: Registered user creates a post in the thread
  const postContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      userConn,
      {
        body: {
          thread_id: thread.id,
          content: postContent,
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 6) Moderator: create moderator account and obtain token
  const modConn: api.IConnection = { ...connection, headers: {} };
  const modEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(modConn, {
      body: {
        username: `mod_${RandomGenerator.alphabets(6)}`,
        email: modEmail,
        password: "ModPass#2025",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(moderator);

  // 7) Moderator performs a moderator action that generates a moderation log (soft-delete thread)
  await api.functional.econPoliticalForum.moderator.threads.erase(modConn, {
    threadId: thread.id,
  });

  // 8) Poll moderationLogs.index until the moderation log is visible or timeout
  let foundEntry: IEconPoliticalForumModerationLog.ISummary | undefined =
    undefined;
  const now = new Date();
  const createdFrom = new Date(now.getTime() - 1000 * 60 * 5).toISOString();
  const createdTo = new Date(now.getTime() + 1000 * 60).toISOString();

  for (let attempt = 0; attempt < 5; ++attempt) {
    const page: IPageIEconPoliticalForumModerationLog.ISummary =
      await api.functional.econPoliticalForum.moderator.moderationLogs.index(
        modConn,
        {
          body: {
            page: 1,
            limit: 20,
            created_from: createdFrom,
            created_to: createdTo,
            target_thread_id: thread.id,
            action_type: "soft_delete",
          } satisfies IEconPoliticalForumModerationLog.IRequest,
        },
      );
    typia.assert(page);

    // Try to find matching log
    foundEntry = page.data.find(
      (e) =>
        e.action_type === "soft_delete" && e.target_thread_id === thread.id,
    );

    if (foundEntry) {
      // Validate pagination
      TestValidator.predicate(
        "pagination present",
        page.pagination !== null && page.pagination !== undefined,
      );
      TestValidator.predicate(
        "pagination has records or at least one data item",
        page.data.length >= 1,
      );
      break;
    }

    // wait 1s before retrying
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 9) Assertions about the moderation log entry
  TestValidator.predicate(
    "moderation log found for the soft-deleted thread",
    foundEntry !== undefined,
  );
  if (foundEntry) {
    typia.assert(foundEntry);
    TestValidator.equals(
      "action type is soft_delete",
      foundEntry.action_type,
      "soft_delete",
    );
    TestValidator.equals(
      "target thread id matches",
      foundEntry.target_thread_id,
      thread.id,
    );
    TestValidator.equals(
      "moderator id matches",
      foundEntry.moderator_id,
      moderator.id,
    );
    TestValidator.predicate(
      "created_at is recent",
      (() => {
        const createdAt = new Date(foundEntry.created_at).getTime();
        return Date.now() - createdAt < 1000 * 60 * 10; // within 10 minutes
      })(),
    );
    TestValidator.predicate(
      "rationale present or redacted excerpt provided",
      foundEntry.rationale !== undefined && foundEntry.rationale !== null,
    );
  }

  // 10) Negative checks: non-moderator (registered user) should not access moderation logs
  await TestValidator.error(
    "non-moderator cannot list moderation logs",
    async () => {
      await api.functional.econPoliticalForum.moderator.moderationLogs.index(
        userConn,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IEconPoliticalForumModerationLog.IRequest,
        },
      );
    },
  );

  // 11) Negative check: unauthenticated caller should not access moderation logs
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot list moderation logs",
    async () => {
      await api.functional.econPoliticalForum.moderator.moderationLogs.index(
        unauthConn,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IEconPoliticalForumModerationLog.IRequest,
        },
      );
    },
  );
}
