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

export async function test_api_post_not_found_for_deleted_or_hidden_public(
  connection: api.IConnection,
) {
  // 1. Administrator signs up and is automatically authenticated by the SDK
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass!234",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Create a moderated category to host the thread
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: RandomGenerator.name(2),
          slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          is_moderated: true,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Register a normal user (author). This will switch connection to the user token
  const authorEmail: string = typia.random<string & tags.Format<"email">>();
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: authorEmail,
        password: "UserPass!234",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 4. Create a thread as the registered user in the created category
  const threadTitle = RandomGenerator.paragraph({ sentences: 8 });
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: threadTitle,
          slug: `thr-${RandomGenerator.alphaNumeric(6)}`,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5. Create a post in the thread as the registered user
  const postContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 12,
    sentenceMax: 20,
  });
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: postContent,
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 6. Register a moderator account (this updates connection.headers.Authorization to moderator token)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: "ModPass!234",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(moderator);

  // 7. As the moderator, perform soft-delete of the post
  await api.functional.econPoliticalForum.moderator.posts.erase(connection, {
    postId: post.id,
  });

  // 8. Public (unauthenticated) client: shallow copy connection with empty headers
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // Public GET should NOT return the post; it should throw (404 or similar)
  await TestValidator.error(
    "public GET should not reveal soft-deleted or hidden post",
    async () => {
      await api.functional.econPoliticalForum.posts.at(publicConn, {
        postId: post.id,
      });
    },
  );

  // 9. Moderator (authenticated via connection) can GET the post and must see deletion indicator
  const moderatorView: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.posts.at(connection, {
      postId: post.id,
    });
  typia.assert(moderatorView);

  // Ensure identity stability and moderation marker presence
  TestValidator.equals(
    "post id remains unchanged for moderator",
    moderatorView.id,
    post.id,
  );
  TestValidator.predicate(
    "moderator view contains deleted_at or is_hidden flag",
    (moderatorView.deleted_at !== null &&
      moderatorView.deleted_at !== undefined) ||
      moderatorView.is_hidden === true,
  );

  // Note: Direct assertion of a row in econ_political_forum_moderation_logs cannot be done
  // with the available SDK functions. If a moderation-log endpoint or DB access
  // is provided in the future, assert that a record with action_type='soft_delete'
  // exists referencing post.id.

  // Teardown: left to test harness (DB reset/transaction rollback) as no
  // permanent cleanup endpoint is exposed in the provided SDK.
}
