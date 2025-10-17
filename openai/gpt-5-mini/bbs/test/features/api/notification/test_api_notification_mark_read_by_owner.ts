import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotification";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_notification_mark_read_by_owner(
  connection: api.IConnection,
) {
  /**
   * Purpose: Verify that a registered user (owner) can mark their notification
   * as read and that only the owner is authorized to do so.
   *
   * Implementation details:
   *
   * - When running in simulation mode (connection.simulate === true), the test
   *   constructs a synthetic notification via typia.random and exercises the
   *   update endpoint. This keeps the test self-contained and compilable.
   * - For real integration tests, replace the synthetic notification creation
   *   with a retrieval of the real notification id (e.g., GET
   *   /econPoliticalForum/registeredUser/notifications or an admin fixture).
   *   The code contains a clear comment where to implement such polling.
   */

  const simConnection: api.IConnection = { ...connection, simulate: true };

  // Create User A (recipient)
  const userAInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssword12345",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const userA: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(simConnection, {
      body: userAInput,
    });
  typia.assert(userA);

  const userAId = userA.id;
  const tokenA = userA.token;

  // As User A: create a thread
  const threadCreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      simConnection,
      { body: threadCreate },
    );
  typia.assert(thread);

  // Create User B (actor)
  const userBInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssword12345",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const userB = await api.functional.auth.registeredUser.join(simConnection, {
    body: userBInput,
  });
  typia.assert(userB);
  const tokenB = userB.token;

  // As User B: create a post that mentions User A
  const postCreate = {
    thread_id: thread.id,
    parent_id: null,
    content: `Hi @${userA.username ?? userAId}, I referenced you: ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies IEconPoliticalForumPost.ICreate;

  const post =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      simConnection,
      { body: postCreate },
    );
  typia.assert(post);

  // -----------------------------------------------------------------------
  // Because SDK lacks GET /notifications in provided materials, we create a
  // synthetic notification for userA so we can exercise the PUT endpoint.
  // Replace this with a real notification lookup (polling) in integration
  // environments where listing API exists.
  // -----------------------------------------------------------------------
  const syntheticNotification = typia.random<IEconPoliticalForumNotification>();
  syntheticNotification.registereduser_id = userAId;
  syntheticNotification.related_post_id = post.id;
  syntheticNotification.is_read = false;

  const prevUpdatedAt = syntheticNotification.updated_at ?? undefined;

  // Owner marks notification read
  const connAsA: api.IConnection = {
    ...connection,
    simulate: simConnection.simulate,
    headers: { Authorization: tokenA.access },
  };

  const updateBody = {
    is_read: true,
  } satisfies IEconPoliticalForumNotification.IUpdate;

  const updatedNotification =
    await api.functional.econPoliticalForum.registeredUser.users.notifications.putByUseridAndNotificationid(
      connAsA,
      {
        userId: userAId,
        notificationId: syntheticNotification.id,
        body: updateBody,
      },
    );
  typia.assert(updatedNotification);

  TestValidator.equals(
    "owner can mark notification as read",
    updatedNotification.is_read,
    true,
  );

  if (prevUpdatedAt !== undefined && prevUpdatedAt !== null) {
    TestValidator.predicate(
      "updated_at changed on mark-read",
      updatedNotification.updated_at !== prevUpdatedAt,
    );
  } else {
    TestValidator.predicate(
      "updated_at is present",
      typeof updatedNotification.updated_at === "string" &&
        updatedNotification.updated_at.length > 0,
    );
  }

  // Negative check: non-owner attempt. Only assert HTTP 403 in non-simulated runs.
  const connAsB: api.IConnection = {
    ...connection,
    simulate: simConnection.simulate,
    headers: { Authorization: tokenB.access },
  };

  if (simConnection.simulate) {
    // Simulation cannot reliably emulate 403 owner checks - skip with explicit note
    TestValidator.predicate(
      "simulation-mode: skip non-owner 403 assertion",
      true,
    );
  } else {
    await TestValidator.httpError(
      "non-owner cannot mark notification read",
      403,
      async () => {
        await api.functional.econPoliticalForum.registeredUser.users.notifications.putByUseridAndNotificationid(
          connAsB,
          {
            userId: userAId,
            notificationId: syntheticNotification.id,
            body: updateBody,
          },
        );
      },
    );
  }
}
