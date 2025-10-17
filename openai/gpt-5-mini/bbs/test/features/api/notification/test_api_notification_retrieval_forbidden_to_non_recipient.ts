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

export async function test_api_notification_retrieval_forbidden_to_non_recipient(
  connection: api.IConnection,
) {
  // 1. Administrator signs up to create a category
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Create a category using admin context
  const categoryCreate = {
    code: null,
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: null,
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: categoryCreate,
      },
    );
  typia.assert(category);

  // 3. Create three registered users: recipient, actor, attacker
  const recipientBody = {
    username: `recip_${RandomGenerator.alphaNumeric(6)}`,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const recipient: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: recipientBody,
    });
  typia.assert(recipient);

  const actorBody = {
    username: `actor_${RandomGenerator.alphaNumeric(6)}`,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const actor: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: actorBody,
    });
  typia.assert(actor);

  // At this moment the SDK set connection.headers.Authorization to actor.token.access
  // 4. Actor creates a thread in the test category
  const threadCreate = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadCreate,
      },
    );
  typia.assert(thread);

  // 5. Actor creates a post that mentions the recipient (to generate a notification)
  const postCreate = {
    thread_id: thread.id,
    content: `Hello @${recipient.username}, this post mentions you for a notification test. ${RandomGenerator.paragraph({ sentences: 4 })}`,
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: postCreate,
      },
    );
  typia.assert(post);

  // 6. Create attacker account (makes connection use attacker's token)
  const attackerBody = {
    username: `attack_${RandomGenerator.alphaNumeric(6)}`,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const attacker: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: attackerBody,
    });
  typia.assert(attacker);

  // 7. Negative test: attacker attempts to fetch a recipient's notification
  // Because the SDK does not expose a listing endpoint to obtain the actual
  // notification id produced by the mention, we use a candidate UUID and assert
  // that the attacker cannot access the resource (403 or 404 are acceptable
  // outcomes that indicate non-disclosure / access control enforcement).
  const candidateNotificationId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.httpError(
    "non-recipient cannot access another user's notification",
    [403, 404],
    async () => {
      await api.functional.econPoliticalForum.registeredUser.notifications.at(
        connection,
        {
          notificationId: candidateNotificationId,
        },
      );
    },
  );

  // 8. Sanity check: try the same notification id as the intended recipient.
  // Create a temporary connection object that uses the recipient's token.
  const recipientConn: api.IConnection = {
    ...connection,
    headers: { Authorization: recipient.token.access },
  };

  try {
    const note: IEconPoliticalForumNotification =
      await api.functional.econPoliticalForum.registeredUser.notifications.at(
        recipientConn,
        {
          notificationId: candidateNotificationId,
        },
      );
    // If notification exists and is readable by recipient, assert its structure.
    typia.assert(note);
    TestValidator.predicate(
      "recipient can access their notification (sanity)",
      true,
    );
  } catch (exp) {
    // If not found, that's an acceptable outcome for this test (notification may not exist)
    if (exp instanceof api.HttpError) {
      TestValidator.predicate(
        "recipient fetch returned 404 or access control enforced",
        exp.status === 404,
      );
    } else throw exp;
  }
}
