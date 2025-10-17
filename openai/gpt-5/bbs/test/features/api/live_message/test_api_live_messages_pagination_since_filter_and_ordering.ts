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
 * Validate public listing of live messages with pagination, ordering, and since
 * filter.
 *
 * Scenario:
 *
 * 1. Register a member (join) – token auto-attached by SDK.
 * 2. Create a post as the member.
 * 3. Create a public live thread (state=live, expertOnly=false,
 *    accessScope=public).
 * 4. Seed 5 live messages with slight delays to ensure increasing createdAt.
 *
 *    - Include a pinned text message and a system message to exercise filters.
 * 5. Using an unauthenticated connection, list messages with:
 *
 *    - Pagination (page=1/page=2, pageSize=2) and sortBy=created_at_asc
 *    - Validate in-page ordering and cross-page continuity
 *    - Compare with a full listing (pageSize=100) for stable ordering
 *    - Since filter: ensure strictly newer than the cursor
 *    - Pinned filter and messageTypes filter validations
 */
export async function test_api_live_messages_pagination_since_filter_and_ordering(
  connection: api.IConnection,
) {
  // 1) Register a member (authentication handled by SDK)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a post to host the live thread
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Create a public live thread (state live)
  const liveThread = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: {
        state: "live",
        accessScope: "public",
        expertOnly: false,
        slowModeIntervalSeconds: 0,
      } satisfies IEconDiscussLiveThread.ICreate,
    },
  );
  typia.assert(liveThread);

  // Helper: small delay to get increasing createdAt ordering
  const delay = async (ms: number) =>
    await new Promise<void>((resolve) => setTimeout(resolve, ms));

  // Helper: seed a message
  const created: IEconDiscussLiveMessage[] = [];
  const seedMessage = async (input: IEconDiscussLiveMessage.ICreate) => {
    const msg =
      await api.functional.econDiscuss.member.posts.live.messages.create(
        connection,
        {
          postId: post.id,
          body: input satisfies IEconDiscussLiveMessage.ICreate,
        },
      );
    typia.assert(msg);
    created.push(msg);
    return msg;
  };

  // 4) Seed multiple messages
  await seedMessage({
    messageType: "text",
    content: RandomGenerator.paragraph({ sentences: 6 }),
    pinned: false,
  });
  await delay(10);
  await seedMessage({
    messageType: "text",
    content: RandomGenerator.paragraph({ sentences: 5 }),
    pinned: false,
  });
  await delay(10);
  await seedMessage({
    messageType: "text",
    content: RandomGenerator.paragraph({ sentences: 5 }),
    pinned: true,
  });
  await delay(10);
  await seedMessage({
    messageType: "system",
  });
  await delay(10);
  await seedMessage({
    messageType: "text",
    content: RandomGenerator.paragraph({ sentences: 4 }),
    pinned: false,
  });

  // 5) Public listing using an unauthenticated connection
  const publicConn: api.IConnection = { ...connection, headers: {} };

  const page1 =
    await api.functional.econDiscuss.posts.live.messages.patchByPostid(
      publicConn,
      {
        postId: post.id,
        body: {
          page: 1,
          pageSize: 2,
          sortBy: "created_at_asc",
          since: null,
        } satisfies IEconDiscussLiveMessage.IRequest,
      },
    );
  typia.assert(page1);

  const page2 =
    await api.functional.econDiscuss.posts.live.messages.patchByPostid(
      publicConn,
      {
        postId: post.id,
        body: {
          page: 2,
          pageSize: 2,
          sortBy: "created_at_asc",
          since: null,
        } satisfies IEconDiscussLiveMessage.IRequest,
      },
    );
  typia.assert(page2);

  // Pagination size checks
  TestValidator.predicate("page1 has at most 2 items", page1.data.length <= 2);
  TestValidator.predicate("page2 has at most 2 items", page2.data.length <= 2);
  TestValidator.predicate("page1 has at least 2 items", page1.data.length >= 2);

  // Ordering validators
  const isAsc = (arr: IEconDiscussLiveMessage[]) =>
    arr.every((m, i, a) =>
      i === 0 ? true : a[i - 1].createdAt <= m.createdAt,
    );
  TestValidator.predicate("page1 ordered by createdAt ASC", isAsc(page1.data));
  TestValidator.predicate("page2 ordered by createdAt ASC", isAsc(page2.data));
  if (page2.data.length > 0) {
    TestValidator.predicate(
      "cross-page boundary maintains ASC order",
      page1.data[page1.data.length - 1]!.createdAt <= page2.data[0]!.createdAt,
    );
  }

  // Full listing for comparison (stable order across requests)
  const allAsc =
    await api.functional.econDiscuss.posts.live.messages.patchByPostid(
      publicConn,
      {
        postId: post.id,
        body: {
          page: 1,
          pageSize: 100,
          sortBy: "created_at_asc",
          since: null,
        } satisfies IEconDiscussLiveMessage.IRequest,
      },
    );
  typia.assert(allAsc);

  TestValidator.equals(
    "page1 continuity equals first two of full listing",
    page1.data,
    allAsc.data.slice(0, 2),
  );
  TestValidator.equals(
    "page2 continuity equals next two of full listing",
    page2.data,
    allAsc.data.slice(2, 4),
  );

  // since filter using the second item's createdAt from page1
  const cursor = page1.data[1]!.createdAt;
  const newer =
    await api.functional.econDiscuss.posts.live.messages.patchByPostid(
      publicConn,
      {
        postId: post.id,
        body: {
          page: 1,
          pageSize: 100,
          sortBy: "created_at_asc",
          since: cursor,
        } satisfies IEconDiscussLiveMessage.IRequest,
      },
    );
  typia.assert(newer);
  TestValidator.predicate(
    "since returns only strictly newer messages",
    newer.data.every((m) => m.createdAt > cursor),
  );
  const expectedNewer = allAsc.data.filter((m) => m.createdAt > cursor);
  TestValidator.equals(
    "since results equal manual filter",
    newer.data,
    expectedNewer,
  );

  // pinned filter
  const pinnedOnly =
    await api.functional.econDiscuss.posts.live.messages.patchByPostid(
      publicConn,
      {
        postId: post.id,
        body: {
          page: 1,
          pageSize: 100,
          sortBy: "created_at_asc",
          pinned: true,
        } satisfies IEconDiscussLiveMessage.IRequest,
      },
    );
  typia.assert(pinnedOnly);
  TestValidator.predicate(
    "pinned filter returns only pinned",
    pinnedOnly.data.every((m) => m.pinned === true),
  );
  const expectedPinned = allAsc.data.filter((m) => m.pinned === true);
  TestValidator.equals(
    "pinned results equal manual filter",
    pinnedOnly.data,
    expectedPinned,
  );

  // messageTypes filter (system)
  const systemSample = allAsc.data.find((m) => m.messageType === "system");
  if (systemSample !== undefined) {
    const systemOnly =
      await api.functional.econDiscuss.posts.live.messages.patchByPostid(
        publicConn,
        {
          postId: post.id,
          body: {
            page: 1,
            pageSize: 100,
            sortBy: "created_at_asc",
            messageTypes: [systemSample.messageType],
          } satisfies IEconDiscussLiveMessage.IRequest,
        },
      );
    typia.assert(systemOnly);
    TestValidator.predicate(
      "messageTypes filter returns only system messages",
      systemOnly.data.every((m) => m.messageType === systemSample.messageType),
    );
    const expectedSystem = allAsc.data.filter(
      (m) => m.messageType === systemSample.messageType,
    );
    TestValidator.equals(
      "system-only results equal manual filter",
      systemOnly.data,
      expectedSystem,
    );
  }

  // Ensure no deleted messages are returned
  TestValidator.predicate(
    "no deleted messages present",
    allAsc.data.every((m) => m.deletedAt === null || m.deletedAt === undefined),
  );
}
