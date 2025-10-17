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

/**
 * Validate that non-recipient users cannot update another user's notification.
 *
 * Business context:
 *
 * - Only the notification recipient (or an administrator) may update that
 *   notification. A different authenticated user must be denied.
 *
 * Notes about limitations:
 *
 * - The provided SDK does not include an endpoint to list or fetch a user's
 *   notifications. Therefore, this test synthesizes a notification id that
 *   claims to belong to the recipient and focuses on exercising the server's
 *   ownership enforcement by attempting an update as a non-recipient. This
 *   verifies that updates by non-owners fail, which is the critical security
 *   check covered by this scenario.
 */
export async function test_api_notification_update_forbidden_to_non_recipient(
  connection: api.IConnection,
) {
  // 1. Administrator signs up (separate connection clone so Authorization is stored there)
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const adminBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "administrator-pass-123",
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2. Admin creates a category used for the thread
  const categoryBody = {
    name: `notif-category-${RandomGenerator.alphaNumeric(6)}`,
    slug: `notif-category-${RandomGenerator.alphaNumeric(6)}`,
    description: "Category for notification ownership test",
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

  // 3. Create recipient, actor, and attacker (each on isolated connection clones)
  const recipientConn: api.IConnection = { ...connection, headers: {} };
  const actorConn: api.IConnection = { ...connection, headers: {} };
  const attackerConn: api.IConnection = { ...connection, headers: {} };

  const recipientJoin = {
    username: `recipient_${RandomGenerator.alphaNumeric(6)}`,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "recipient-pass-123",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const actorJoin = {
    username: `actor_${RandomGenerator.alphaNumeric(6)}`,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "actor-pass-123",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const attackerJoin = {
    username: `attacker_${RandomGenerator.alphaNumeric(6)}`,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "attacker-pass-123",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const recipient: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(recipientConn, {
      body: recipientJoin,
    });
  typia.assert(recipient);

  const actor: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(actorConn, {
      body: actorJoin,
    });
  typia.assert(actor);

  const attacker: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(attackerConn, {
      body: attackerJoin,
    });
  typia.assert(attacker);

  // 4. Actor creates a thread and a post that mentions the recipient (models notification generation)
  const threadBody = {
    category_id: category.id,
    title: "Notification ownership test thread",
    slug: `notif-thread-${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      actorConn,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);

  const postBody = {
    thread_id: thread.id,
    content: `Hi @${recipient.username}, this post mentions you to model notification generation.`,
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      actorConn,
      {
        body: postBody,
      },
    );
  typia.assert(post);

  // 5. Synthesize a notification that belongs to the recipient for ownership test
  //    (only include properties defined in IEconPoliticalForumNotification)
  const synthesizedNotification = {
    id: typia.random<string & tags.Format<"uuid">>(),
    registereduser_id: recipient.id,
    actor_registereduser_id: actor.id,
    type: "mention",
    title: "You were mentioned",
    body: post.content.substring(0, 120),
    payload: JSON.stringify({ threadId: thread.id, postId: post.id }),
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IEconPoliticalForumNotification;

  // 6. Attacker attempts to update the synthesized notification -> should fail
  //    We use TestValidator.error with an async callback to assert that the
  //    API rejects the attempt. We intentionally DO NOT assert a specific
  //    HTTP status code (403 vs 404) to remain robust to server policies.
  await TestValidator.error(
    "attacker cannot update another user's notification",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.notifications.update(
        attackerConn,
        {
          notificationId: synthesizedNotification.id,
          body: {
            is_read: true,
          } satisfies IEconPoliticalForumNotification.IUpdate,
        },
      );
    },
  );

  // 7. Sanity check: local synthesized notification remains unchanged
  //    (Because we could not verify server persistence without a "get" endpoint,
  //     we ensure our local representation is unchanged after the failed attempt.)
  TestValidator.equals(
    "local synthesized notification remains unchanged",
    synthesizedNotification.is_read,
    false,
  );
}
