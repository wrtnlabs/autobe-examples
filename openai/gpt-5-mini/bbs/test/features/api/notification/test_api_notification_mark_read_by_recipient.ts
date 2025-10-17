import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotification";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_notification_mark_read_by_recipient(
  connection: api.IConnection,
) {
  // 1. Administrator registers (used to create a category)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPass123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Create a test category (admin context)
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: `test-category-${RandomGenerator.alphaNumeric(6)}`,
          slug: `test-category-${RandomGenerator.alphaNumeric(6)}`,
          description: "Category for notification e2e test",
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create recipient registered user with deterministic username for mention
  const recipientUsername = `rec_${RandomGenerator.alphaNumeric(8)}`;
  const recipientEmail = typia.random<string & tags.Format<"email">>();
  const recipientAuth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: recipientUsername,
        email: recipientEmail,
        password: "RecipientPass123!",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(recipientAuth);

  // 4. Create actor registered user (will become the current auth in connection)
  const actorUsername = `actor_${RandomGenerator.alphaNumeric(8)}`;
  const actorEmail = typia.random<string & tags.Format<"email">>();
  const actorAuth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: actorUsername,
        email: actorEmail,
        password: "ActorPass123!",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(actorAuth);

  // 5. Actor creates a thread in the category
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: `thread-${RandomGenerator.alphaNumeric(8)}`,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 6. Actor creates a post that mentions the recipient (triggering notification in a real system)
  const postContent = `@${recipientUsername} ${RandomGenerator.content({ paragraphs: 1 })}`;
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

  // NOTE (IMPORTANT): The SDK materials provided do NOT include a notification
  // listing or retrieval endpoint. Therefore, to call the notifications.update
  // endpoint we must supply a notificationId. In simulated SDK mode the call
  // will return a mocked notification. For real integration tests replace the
  // generated notificationId below with the actual id obtained from a
  // notifications listing API or a test DB query.

  // 7. Mark notification as read using a generated UUID (placeholder)
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  const updated: IEconPoliticalForumNotification =
    await api.functional.econPoliticalForum.registeredUser.notifications.update(
      connection,
      {
        notificationId,
        body: {
          is_read: true,
        } satisfies IEconPoliticalForumNotification.IUpdate,
      },
    );
  typia.assert(updated);

  // 8. Business assertions
  TestValidator.equals("notification is marked read", updated.is_read, true);
  TestValidator.predicate(
    "updated_at is a valid ISO date-time",
    () => !Number.isNaN(Date.parse(updated.updated_at)),
  );
}
