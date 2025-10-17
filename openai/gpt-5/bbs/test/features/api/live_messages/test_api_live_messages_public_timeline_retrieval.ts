import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IELiveMessageType } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveMessageType";
import type { IELiveThreadAccessScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadAccessScope";
import type { IELiveThreadState } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadState";
import type { IEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveMessage";
import type { IEconDiscussLiveThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveThread";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussLiveMessage";

/**
 * Validate public retrieval of a post’s live thread message timeline.
 *
 * Steps:
 *
 * 1. Register a member user and authenticate (token auto-managed by SDK)
 * 2. Create a post as the member
 * 3. Create a public-access live thread on the post (state=live)
 * 4. Publish at least one text live message in that thread
 * 5. Create an unauthenticated connection and GET messages publicly
 * 6. Validate ordering, presence, and pagination integrity
 *
 *    - Messages are ordered by createdAt descending
 *    - Created message appears in the public listing
 *    - No soft-deleted messages are returned (deletedAt null/undefined)
 *    - Page.data.length <= pagination.limit and records >= data.length
 */
export async function test_api_live_messages_public_timeline_retrieval(
  connection: api.IConnection,
) {
  // 1) Register a member (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create a post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 8,
    }),
    summary: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    scheduled_publish_at: null,
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  // 3) Create a live thread with public access
  const liveThreadBody = {
    state: "live",
    expertOnly: false,
    accessScope: "public",
    scheduledStartAt: null,
    slowModeIntervalSeconds: null,
  } satisfies IEconDiscussLiveThread.ICreate;
  const liveThread = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: liveThreadBody,
    },
  );
  typia.assert(liveThread);

  // 4) Publish a live message
  const createMessageBody = {
    messageType: "text",
    content: RandomGenerator.paragraph({
      sentences: 12,
      wordMin: 3,
      wordMax: 10,
    }),
    pinned: false,
  } satisfies IEconDiscussLiveMessage.ICreate;
  const createdMessage =
    await api.functional.econDiscuss.member.posts.live.messages.create(
      connection,
      {
        postId: post.id,
        body: createMessageBody,
      },
    );
  typia.assert(createdMessage);

  // 5) Create an unauthenticated connection for public GET
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 6) Fetch messages publicly
  const page = await api.functional.econDiscuss.posts.live.messages.getByPostid(
    publicConn,
    { postId: post.id },
  );
  typia.assert(page);

  // Basic expectations
  TestValidator.predicate(
    "public listing returns at least one message",
    page.data.length >= 1,
  );

  // Ordering: createdAt DESC (monotonic non-increasing)
  const isDesc = page.data.every((msg, i, arr) =>
    i === 0
      ? true
      : new Date(arr[i - 1].createdAt).getTime() >=
        new Date(msg.createdAt).getTime(),
  );
  TestValidator.predicate(
    "messages are ordered by createdAt descending",
    isDesc,
  );

  // Presence: created message should appear in public listing
  const found = page.data.find((m) => m.id === createdMessage.id);
  TestValidator.predicate(
    "created message appears in public timeline",
    found !== undefined,
  );
  if (found !== undefined) {
    typia.assertGuard<IEconDiscussLiveMessage>(found!);
    TestValidator.equals(
      "found message id matches created",
      found.id,
      createdMessage.id,
    );
    TestValidator.equals(
      "found message content matches",
      found.content,
      createdMessage.content,
    );
    TestValidator.equals(
      "found message pinned flag preserved",
      found.pinned,
      createdMessage.pinned,
    );
    TestValidator.predicate(
      "found message is not soft-deleted",
      found.deletedAt === null || found.deletedAt === undefined,
    );
  }

  // Pagination integrity checks
  TestValidator.predicate(
    "page.data length does not exceed pagination.limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "pagination.records >= page.data length",
    page.pagination.records >= page.data.length,
  );
}
