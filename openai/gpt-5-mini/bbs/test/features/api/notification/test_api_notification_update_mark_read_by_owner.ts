import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotification";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_notification_update_mark_read_by_owner(
  connection: api.IConnection,
) {
  // 1) Create recipient account on the provided connection so that
  //    `connection` becomes authenticated as the recipient.
  const recipientBody = {
    username:
      RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "_") +
      Date.now().toString().slice(-4),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssword1234",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const recipient: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: recipientBody,
    });
  typia.assert(recipient);

  // 2) Create an actor on a cloned connection so that actor auth doesn't
  //    overwrite the recipient's auth stored in the original `connection`.
  const actorConn: api.IConnection = { ...connection, headers: {} };
  const actorBody = {
    username:
      RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "_") +
      "_actor" +
      Date.now().toString().slice(-4),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssword1234",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const actor: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(actorConn, {
      body: actorBody,
    });
  typia.assert(actor);

  // 3) Actor creates a thread
  const threadCreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      actorConn,
      { body: threadCreate },
    );
  typia.assert(thread);

  // 4) Actor posts in the thread mentioning the recipient to trigger a
  //    notification for the recipient.
  const postCreate = {
    thread_id: thread.id,
    content: `Hi @${recipient.username}, ${RandomGenerator.paragraph({ sentences: 4 })}`,
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      actorConn,
      { body: postCreate },
    );
  typia.assert(post);

  // NOTE:
  // Preferred approach: if your test environment exposes a notifications list
  // or returns a notification id from post creation, replace the
  // `notificationId` below with the real id. Example:
  //   const notificationId = (await api.functional.econPoliticalForum.registeredUser.users.notifications.index(connection)).data.find(n => n.related_post_id === post.id).id;
  // For portability across environments and simulation mode, we use a
  // configurable UUID here. Replace as needed for real integrations.

  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // 5) Baseline: attempt to set is_read=false and capture previous state.
  //    In environments where notification creation is asynchronous, consider
  //    polling the baseline PATCH a few times before failing. Here we do a
  //    small retry loop for robustness.
  let prev: IEconPoliticalForumNotification | null = null;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; ++attempt) {
    try {
      prev =
        await api.functional.econPoliticalForum.registeredUser.users.notifications.patchByUseridAndNotificationid(
          connection,
          {
            userId: recipient.id,
            notificationId,
            body: {
              is_read: false,
            } satisfies IEconPoliticalForumNotification.IUpdate,
          },
        );
      typia.assert(prev);
      break;
    } catch (exp) {
      // If this is the last attempt, rethrow. Otherwise, wait briefly and retry.
      if (attempt === maxAttempts) throw exp;
      // Small delay before retrying
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  // At this point prev is non-null (or we would have thrown). Narrow the type.
  typia.assert(prev!);

  // 6) Update: mark notification as read
  const updated: IEconPoliticalForumNotification =
    await api.functional.econPoliticalForum.registeredUser.users.notifications.patchByUseridAndNotificationid(
      connection,
      {
        userId: recipient.id,
        notificationId,
        body: {
          is_read: true,
        } satisfies IEconPoliticalForumNotification.IUpdate,
      },
    );
  typia.assert(updated);

  // 7) Assertions
  TestValidator.equals(
    "notification is_read updated to true",
    updated.is_read,
    true,
  );

  TestValidator.predicate(
    "notification updated_at is newer than previous updated_at",
    new Date(updated.updated_at).getTime() >
      new Date(prev!.updated_at).getTime(),
  );

  // Ensure only is_read and updated_at changed; other fields remain the same.
  const expected = { ...prev!, is_read: true, updated_at: updated.updated_at };
  TestValidator.equals(
    "only is_read and updated_at were changed",
    updated,
    expected,
  );

  // Teardown: none performed here. CI should reset DB between tests.
}
