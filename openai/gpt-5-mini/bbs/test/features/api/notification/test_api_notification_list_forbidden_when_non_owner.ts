import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotification";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumNotification";

export async function test_api_notification_list_forbidden_when_non_owner(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Ensure that a regular registered user cannot list another user's
   *   notifications (ownership enforced).
   *
   * Workflow:
   *
   * 1. Create two users (owner and otherUser) on two separate connection clones so
   *    that each connection receives its own Authorization token from the SDK's
   *    join() call.
   * 2. Using otherUser's session, create a thread and a post that mentions the
   *    owner (using the owner's username) so that the owner should receive a
   *    notification.
   * 3. Using owner session, list notifications to confirm owner received a
   *    notification.
   * 4. Using otherUser session, attempt to list owner's notifications and assert
   *    this results in an authorization error (403/401). Use
   *    TestValidator.error with async callback.
   * 5. Re-list owner's notifications as owner and assert counts unchanged.
   */

  // 1) Prepare isolated connections for two users
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };

  // 2) Register owner
  const ownerUsername = RandomGenerator.alphaNumeric(8);
  const ownerBody = {
    username: ownerUsername,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd2025",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(ownerConn, {
      body: ownerBody,
    });
  typia.assert(owner);

  // 3) Register other user (actor)
  const otherUsername = RandomGenerator.alphaNumeric(8);
  const otherBody = {
    username: otherUsername,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd2025",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const other: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(otherConn, {
      body: otherBody,
    });
  typia.assert(other);

  // 4) As otherUser, create a thread (use typia.random to get valid create DTO)
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      otherConn,
      {
        body: typia.random<IEconPoliticalForumThread.ICreate>(),
      },
    );
  typia.assert(thread);

  // 5) As otherUser, create a post that mentions the owner to trigger a notification
  const postBody = {
    thread_id: thread.id,
    content: `@${ownerBody.username} ${RandomGenerator.paragraph({ sentences: 6 })}`,
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      otherConn,
      {
        body: postBody,
      },
    );
  typia.assert(post);

  // 6) As owner, list notifications to confirm receipt
  const pageBefore: IPageIEconPoliticalForumNotification.ISummary =
    await api.functional.econPoliticalForum.registeredUser.users.notifications.index(
      ownerConn,
      {
        userId: owner.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalForumNotification.IRequest,
      },
    );
  typia.assert(pageBefore);

  TestValidator.predicate(
    "owner received at least one notification after being mentioned",
    pageBefore.data.length > 0,
  );

  // Save the record count for later comparison
  const beforeCount: number = pageBefore.pagination.records;

  // 7) As otherUser attempt to list owner's notifications → should fail
  await TestValidator.error(
    "other user cannot list another user's notifications",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.users.notifications.index(
        otherConn,
        {
          userId: owner.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IEconPoliticalForumNotification.IRequest,
        },
      );
    },
  );

  // 8) Re-fetch owner's notifications to ensure DB state unchanged
  const pageAfter: IPageIEconPoliticalForumNotification.ISummary =
    await api.functional.econPoliticalForum.registeredUser.users.notifications.index(
      ownerConn,
      {
        userId: owner.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalForumNotification.IRequest,
      },
    );
  typia.assert(pageAfter);

  TestValidator.equals(
    "owner notifications unchanged",
    pageAfter.pagination.records,
    beforeCount,
  );
}
