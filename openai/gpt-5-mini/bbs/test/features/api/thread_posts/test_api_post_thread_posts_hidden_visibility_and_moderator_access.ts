import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumPost";

/**
 * Validate moderator-only visibility flags for thread post listings.
 *
 * Business purpose:
 *
 * - Ensure ordinary callers (public/unauthenticated) cannot request
 *   moderator-only content by setting includeHidden/includeDeleted. Such
 *   attempts must be rejected.
 * - Ensure moderators can request moderator-only content and receive
 *   hidden/soft-deleted posts (including moderation-only fields: is_hidden,
 *   deleted_at) for triage.
 *
 * Steps:
 *
 * 1. Administrator signs up and creates a category.
 * 2. Registered user signs up, creates a thread in that category, and creates a
 *    post.
 * 3. Moderator signs up and performs moderator soft-delete/hide on the post.
 * 4. Public (unauthenticated) client attempts to call posts.index with
 *    includeHidden=true and must receive an error (assert via
 *    TestValidator.error).
 * 5. Moderator client calls posts.index with includeHidden=true and must receive
 *    the hidden/soft-deleted post with moderation flags visible.
 */
export async function test_api_post_thread_posts_hidden_visibility_and_moderator_access(
  connection: api.IConnection,
) {
  // 1. Administrator signs up
  const adminPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminPayload,
    });
  typia.assert(admin);

  // 2. Administrator creates a category
  const categoryCreate = {
    code: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    description: null,
    is_moderated: true,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryCreate },
    );
  typia.assert(category);

  // 3. Registered user signs up
  const userPayload = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userPayload,
    });
  typia.assert(user);

  // 4. Registered user creates a thread in the category
  const threadCreate = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    slug: `thread-${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadCreate },
    );
  typia.assert(thread);

  // 5. Registered user creates a root post in the thread
  const postCreate = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postCreate },
    );
  typia.assert(post);

  // 6. Moderator signs up
  const moderatorPayload = {
    username: `mod_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumModerator.ICreate;

  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorPayload,
    });
  typia.assert(moderator);

  // 7. Moderator soft-deletes / hides the created post
  await api.functional.econPoliticalForum.moderator.posts.erase(connection, {
    postId: post.id,
  });

  // 8A. Public attempt (unauthenticated) to include hidden posts -> must error
  const publicConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "public cannot request includeHidden (should be rejected)",
    async () => {
      await api.functional.econPoliticalForum.threads.posts.index(publicConn, {
        threadId: thread.id,
        body: {
          includeHidden: true,
        } satisfies IEconPoliticalForumPost.IRequest,
      });
    },
  );

  // 8B. Moderator attempt to include hidden posts -> must succeed and return hidden/deleted post
  const page: IPageIEconPoliticalForumPost =
    await api.functional.econPoliticalForum.threads.posts.index(connection, {
      threadId: thread.id,
      body: { includeHidden: true } satisfies IEconPoliticalForumPost.IRequest,
    });
  typia.assert(page);

  // Validate that the moderator response contains the target post and moderation-only flags
  const found = page.data.find((p) => p.id === post.id);
  TestValidator.predicate(
    "moderator result includes the targeted post",
    found !== undefined,
  );

  // If found, ensure is_hidden === true OR deleted_at is present
  if (found) {
    typia.assert(found);
    TestValidator.predicate(
      "moderator can see moderation flags (is_hidden or deleted_at)",
      found.is_hidden === true ||
        (found.deleted_at !== null && found.deleted_at !== undefined),
    );
  }
}
