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
 * Ensure invite_only live threads are excluded from the public index.
 *
 * Business context:
 *
 * - Live threads configured as invite_only must not be discoverable by public
 *   callers.
 * - Authenticated owners/hosts can still see their own threads via scoped
 *   queries.
 *
 * Steps:
 *
 * 1. Join as a member (host), which authenticates the SDK connection
 *    automatically.
 * 2. Create a Post that will host the live thread.
 * 3. Create a Live Thread on that Post with accessScope = "invite_only".
 * 4. Create an unauthenticated connection clone and call the public index.
 * 5. Validate the created invite_only thread is not present in the public index
 *    results.
 * 6. Supportive check: authenticated index with myThreadsOnly=true contains the
 *    thread.
 */
export async function test_api_live_threads_invite_only_excluded_from_public_index(
  connection: api.IConnection,
) {
  // 1) Join as a member (host)
  const joinOutput: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12), // >= 8 chars
        display_name: RandomGenerator.name(1),
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussMember.ICreate,
    });
  typia.assert(joinOutput);

  // 2) Create a Post to host the live thread
  const postCreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    summary: RandomGenerator.paragraph({ sentences: 6 }),
    // scheduled_publish_at is optional; include a realistic ISO string sometimes
    // scheduled_publish_at: new Date().toISOString(),
  } satisfies IEconDiscussPost.ICreate;

  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // 3) Create a Live Thread with invite_only access
  const liveCreate = {
    state: "waiting",
    expertOnly: false,
    accessScope: "invite_only",
    scheduledStartAt: new Date().toISOString(),
    slowModeIntervalSeconds: 5,
  } satisfies IEconDiscussLiveThread.ICreate;

  const live: IEconDiscussLiveThread =
    await api.functional.econDiscuss.member.posts.live.create(connection, {
      postId: post.id,
      body: liveCreate,
    });
  typia.assert(live);

  // 4) Derive an unauthenticated connection (public caller)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 5) Call public index (PATCH /econDiscuss/liveThreads) and validate exclusion
  const publicIndex: IPageIEconDiscussLiveThread.ISummary =
    await api.functional.econDiscuss.liveThreads.index(unauthConn, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IEconDiscussLiveThread.IRequest,
    });
  typia.assert(publicIndex);

  const publiclyFound = publicIndex.data.find((row) => row.id === live.id);
  TestValidator.equals(
    "invite_only live thread must be excluded from public index",
    publiclyFound,
    undefined,
  );

  // 6) Authenticated support: author should see own thread
  const myIndex: IPageIEconDiscussLiveThread.ISummary =
    await api.functional.econDiscuss.liveThreads.index(connection, {
      body: {
        page: 1,
        limit: 50,
        myThreadsOnly: true,
      } satisfies IEconDiscussLiveThread.IRequest,
    });
  typia.assert(myIndex);

  const mine = myIndex.data.find((row) => row.id === live.id);
  TestValidator.predicate(
    "author can view own invite_only live thread via authenticated index",
    () => mine !== undefined,
  );
}
