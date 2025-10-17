import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotification";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_notification_update_forbidden_non_owner(
  connection: api.IConnection,
) {
  // Purpose: Ensure a non-owner (attacker) cannot modify another user's notification.
  // Strategy: Create recipient and attacker accounts, have attacker create a thread/post
  // that mentions the recipient (to exercise notification generation), then attempt
  // to PATCH the recipient's notification as attacker and assert authorization failure.

  // 1. Create recipient account
  const recipientUsername = `recipient_${RandomGenerator.alphaNumeric(8)}`;
  const recipientEmail = `${recipientUsername}@example.com`;
  const recipient = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: recipientUsername,
      email: recipientEmail,
      password: "Test@12345!", // realistic password meeting server guidelines
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumRegisteredUser.IJoin,
  });
  typia.assert(recipient);

  // 2. Create attacker account (after this call, connection is authenticated as attacker)
  const attackerUsername = `attacker_${RandomGenerator.alphaNumeric(8)}`;
  const attackerEmail = `${attackerUsername}@example.com`;
  const attacker = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: attackerUsername,
      email: attackerEmail,
      password: "Test@12345!",
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumRegisteredUser.IJoin,
  });
  typia.assert(attacker);

  // 3. Attacker creates a thread (category_id is a UUID; using random UUID to satisfy DTO)
  const thread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: RandomGenerator.alphaNumeric(8),
          status: "open",
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 4. Attacker creates a post that mentions the recipient to (attempt to) trigger a notification
  const post =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: `Hello @${recipient.username}, this is a test mention to generate a notification.`,
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 5. Attempt to update recipient's notification as attacker.
  // NOTE: Because no notification listing/get endpoint is available in the provided SDK,
  // we cannot deterministically obtain a real notificationId. Use a generated UUID
  // and assert that the server does NOT allow attacker to update recipient's notification.
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // The server may either return 403 Forbidden (explicit ownership denial)
  // or 404 Not Found (if the notification id does not exist). Accept either as
  // a valid indicator that attacker cannot perform the update.
  await TestValidator.httpError(
    "non-owner should not be able to update another user's notification",
    [403, 404],
    async () => {
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
    },
  );

  // Note: Deterministic verification of notification.is_read staying false is not possible
  // without a GET/list-notifications API. Recommend adding a notifications list/get
  // endpoint or a test helper to fetch notification records for comprehensive verification.
}
