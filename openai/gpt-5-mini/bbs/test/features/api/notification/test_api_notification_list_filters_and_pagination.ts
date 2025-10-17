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

export async function test_api_notification_list_filters_and_pagination(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Create two users (owner, actor)
   * - Actor creates a thread and several posts mentioning the owner to generate
   *   notifications
   * - As owner, call notifications.index with filter is_read=false and pagination
   *   (page=1, limit=5)
   * - Validate pagination metadata, returned items count and unread-state, then
   *   request page=2
   * - Validate sorting by created_at desc
   */

  // Create isolated connections for two users so SDK-managed headers do not collide.
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const actorConn: api.IConnection = { ...connection, headers: {} };

  // 1) Create owner account
  const ownerBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Test@12345",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(ownerConn, {
      body: ownerBody,
    });
  typia.assert(owner);

  // 2) Create actor account
  const actorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(6)}@example.org`,
    password: "Test@12345",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const actor: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(actorConn, {
      body: actorBody,
    });
  typia.assert(actor);

  // 3) Actor creates a thread
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Safer slug generation: alphanumeric chunk with optional hyphen
  const slug =
    `${RandomGenerator.alphaNumeric(6)}-${RandomGenerator.alphaNumeric(4)}`.toLowerCase();
  const threadBody = {
    category_id: categoryId,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    slug,
    status: "open",
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      actorConn,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);

  // 4) Actor creates multiple posts mentioning the owner to produce notifications
  const POSTS_COUNT = 9; // create 9 posts to ensure pagination across pages
  const createdPosts: IEconPoliticalForumPost[] = await ArrayUtil.asyncRepeat(
    POSTS_COUNT,
    async (i) => {
      // Use the known owner username from ownerBody to ensure mention token exists
      const mentionTarget = ownerBody.username;
      const content = `${RandomGenerator.paragraph({ sentences: 8 })}\n@${mentionTarget} mention for notification #${i + 1}`;
      const postBody = {
        thread_id: thread.id,
        content,
      } satisfies IEconPoliticalForumPost.ICreate;

      const post: IEconPoliticalForumPost =
        await api.functional.econPoliticalForum.registeredUser.posts.create(
          actorConn,
          {
            body: postBody,
          },
        );
      typia.assert(post);
      return post;
    },
  );

  // 5) As owner, request notifications with filter is_read=false, page=1, limit=5
  const page1: IPageIEconPoliticalForumNotification.ISummary =
    await api.functional.econPoliticalForum.registeredUser.users.notifications.index(
      ownerConn,
      {
        userId: owner.id,
        body: {
          is_read: false,
          page: 1,
          limit: 5,
          sort_by: "created_at",
          order: "desc",
        } satisfies IEconPoliticalForumNotification.IRequest,
      },
    );
  typia.assert(page1);

  // Validate pagination metadata and contents
  TestValidator.equals(
    "page 1 current page should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit should be 5", page1.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 items count must be <= limit",
    page1.data.length <= page1.pagination.limit,
  );

  // All returned items must be unread (is_read === false)
  TestValidator.predicate(
    "all items in page 1 must be unread",
    page1.data.every((n) => n.is_read === false),
  );

  // Validate newest-first ordering by created_at (desc)
  if (page1.data.length > 1) {
    const timestamps = page1.data.map((d) => Date.parse(d.created_at));
    const isDesc = timestamps.every(
      (t, idx) => idx === 0 || timestamps[idx - 1] >= t,
    );
    TestValidator.predicate("page 1 results sorted by created_at desc", isDesc);
  }

  // 6) Request page 2 and validate continuity
  const page2: IPageIEconPoliticalForumNotification.ISummary =
    await api.functional.econPoliticalForum.registeredUser.users.notifications.index(
      ownerConn,
      {
        userId: owner.id,
        body: {
          is_read: false,
          page: 2,
          limit: 5,
          sort_by: "created_at",
          order: "desc",
        } satisfies IEconPoliticalForumNotification.IRequest,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "page 2 current page should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 items count must be <= limit",
    page2.data.length <= page2.pagination.limit,
  );
  TestValidator.predicate(
    "all items in page 2 must be unread",
    page2.data.every((n) => n.is_read === false),
  );

  // If there are items on both pages, ensure combined total is <= reported records
  const combinedCount = page1.data.length + page2.data.length;
  TestValidator.predicate(
    "combined pages count must be <= total records",
    combinedCount <= page1.pagination.records,
  );

  // Pagination pages consistency: when limit > 0, expected pages = ceil(records / limit)
  if (page1.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      page1.pagination.records / page1.pagination.limit,
    );
    TestValidator.predicate(
      "pagination pages equals computed pages",
      page1.pagination.pages === expectedPages,
    );
  } else {
    TestValidator.predicate(
      "pagination pages non-negative",
      page1.pagination.pages >= 0,
    );
  }
}
