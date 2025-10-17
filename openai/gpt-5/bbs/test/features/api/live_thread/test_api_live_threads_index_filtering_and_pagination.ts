import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussLiveAccessScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussLiveAccessScope";
import type { IEEconDiscussLiveThreadState } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussLiveThreadState";
import type { IELiveThreadAccessScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadAccessScope";
import type { IELiveThreadOrderBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadOrderBy";
import type { IELiveThreadState } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadState";
import type { IEOrderDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEOrderDirection";
import type { IEconDiscussLiveThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveThread";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussLiveThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussLiveThread";

/**
 * Validate public listing, filtering, and pagination of live threads.
 *
 * Business flow:
 *
 * 1. Register a member (SDK sets Authorization automatically).
 * 2. Create three posts to host live threads.
 * 3. Create threads with varied attributes:
 *
 *    - A: state=live, expertOnly=false, accessScope=public (start now)
 *    - B: state=scheduled, expertOnly=true, accessScope=public, scheduled soon
 *    - C: state=scheduled, expertOnly=false, accessScope=public
 * 4. Filtering checks (scoped by postId for determinism):
 *
 *    - State filter "live" includes A
 *    - ExpertOnly filter true includes B
 * 5. Pagination stability using myThreadsOnly with orderBy created_at desc:
 *
 *    - Page 1 and page 2 differ and ordering is consistent
 * 6. Public access with unauthenticated connection can list public B by postId.
 */
export async function test_api_live_threads_index_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1) Register a member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create three posts
  const postBody1 = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const postBody2 = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const postBody3 = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEconDiscussPost.ICreate;

  const postA = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody1,
    },
  );
  typia.assert(postA);
  const postB = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody2,
    },
  );
  typia.assert(postB);
  const postC = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody3,
    },
  );
  typia.assert(postC);

  // 3) Create live threads with varied attributes
  const threadA = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: postA.id,
      body: {
        state: "live",
        expertOnly: false,
        accessScope: "public",
        // startedAt is server-managed when state is live
      } satisfies IEconDiscussLiveThread.ICreate,
    },
  );
  typia.assert(threadA);

  const soon = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // +5 minutes
  const threadB = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: postB.id,
      body: {
        state: "scheduled",
        expertOnly: true,
        accessScope: "public",
        scheduledStartAt: soon,
      } satisfies IEconDiscussLiveThread.ICreate,
    },
  );
  typia.assert(threadB);

  const threadC = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: postC.id,
      body: {
        state: "scheduled",
        expertOnly: false,
        accessScope: "public",
      } satisfies IEconDiscussLiveThread.ICreate,
    },
  );
  typia.assert(threadC);

  // 4a) Filter by state: ["live"], scoped by postId = postA.id → must include A
  const liveList = await api.functional.econDiscuss.liveThreads.index(
    connection,
    {
      body: {
        state: ["live"],
        postId: postA.id,
        orderBy: "created_at",
        orderDirection: "desc",
      } satisfies IEconDiscussLiveThread.IRequest,
    },
  );
  typia.assert(liveList);
  const foundA = liveList.data.find((x) => x.id === threadA.id);
  TestValidator.predicate(
    "live state filter should include Thread A",
    foundA !== undefined,
  );

  // 4b) Filter by expertOnly: true, scoped by postId = postB.id → must include B
  const expertList = await api.functional.econDiscuss.liveThreads.index(
    connection,
    {
      body: {
        expertOnly: true,
        postId: postB.id,
        orderBy: "created_at",
        orderDirection: "desc",
      } satisfies IEconDiscussLiveThread.IRequest,
    },
  );
  typia.assert(expertList);
  const foundB = expertList.data.find((x) => x.id === threadB.id);
  TestValidator.predicate(
    "expertOnly=true filter should include Thread B",
    foundB !== undefined,
  );

  // 5) Pagination stability using myThreadsOnly and limit=1 (need at least 2 items)
  const page1 = await api.functional.econDiscuss.liveThreads.index(connection, {
    body: {
      myThreadsOnly: true,
      orderBy: "created_at",
      orderDirection: "desc",
      page: 1 satisfies number as number,
      limit: 1 satisfies number as number,
    } satisfies IEconDiscussLiveThread.IRequest,
  });
  typia.assert(page1);

  const page2 = await api.functional.econDiscuss.liveThreads.index(connection, {
    body: {
      myThreadsOnly: true,
      orderBy: "created_at",
      orderDirection: "desc",
      page: 2 satisfies number as number,
      limit: 1 satisfies number as number,
    } satisfies IEconDiscussLiveThread.IRequest,
  });
  typia.assert(page2);

  const item1 = page1.data[0];
  const item2 = page2.data[0];
  TestValidator.predicate(
    "pagination: page1 and page2 should differ when limit=1",
    item1 !== undefined && item2 !== undefined && item1.id !== item2.id,
  );
  if (item1 !== undefined && item2 !== undefined) {
    const t1 = new Date(item1.createdAt).getTime();
    const t2 = new Date(item2.createdAt).getTime();
    TestValidator.predicate(
      "ordering by created_at desc should have page1 >= page2",
      t1 >= t2,
    );
  }

  // 6) Public accessibility without authentication for public Thread B via postId
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const publicList = await api.functional.econDiscuss.liveThreads.index(
    publicConn,
    {
      body: {
        postId: postB.id,
        orderBy: "created_at",
        orderDirection: "desc",
        limit: 10 satisfies number as number,
      } satisfies IEconDiscussLiveThread.IRequest,
    },
  );
  typia.assert(publicList);
  const publicHasB =
    publicList.data.find((x) => x.id === threadB.id) !== undefined;
  TestValidator.predicate(
    "unauthenticated index should list public Thread B by postId",
    publicHasB,
  );
}
