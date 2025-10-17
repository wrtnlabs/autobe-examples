import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IELiveThreadAccessScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadAccessScope";
import type { IELiveThreadState } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadState";
import type { IEconDiscussLiveThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveThread";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Verify that invite_only live threads are not retrievable by unauthorized
 * callers.
 *
 * Business context:
 *
 * - A LiveThread is created by a member on a post, with access controls via
 *   accessScope.
 * - When accessScope is "invite_only", retrieval should be denied for callers who
 *   are unauthenticated or authenticated as other users not invited to the
 *   thread.
 *
 * Test steps:
 *
 * 1. Join as Member A (host) to authenticate.
 * 2. Create a Post as Member A.
 * 3. Create a LiveThread for that post with accessScope = "invite_only".
 * 4. Attempt to GET the live thread: 4-1) as an unauthenticated caller → expect
 *    error (no status code assertion) 4-2) as a different authenticated Member
 *    B → expect error (no status code assertion)
 *
 * Validations:
 *
 * - Typia.assert on all successful creation responses.
 * - LiveThread.postId matches created post.id.
 * - LiveThread.accessScope is exactly "invite_only".
 * - Denials produce errors captured by TestValidator.error with async closures.
 */
export async function test_api_live_thread_invite_only_access_denied(
  connection: api.IConnection,
) {
  // 1) Join as Member A (host)
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const hostAuth = await api.functional.auth.member.join(connection, {
    body: joinBodyA,
  });
  typia.assert(hostAuth);

  // 2) Create a Post as Member A
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  // 3) Create a LiveThread (invite_only)
  const liveCreateBody = {
    accessScope: "invite_only",
    state: "waiting",
    slowModeIntervalSeconds: null,
  } satisfies IEconDiscussLiveThread.ICreate;
  const thread = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: liveCreateBody,
    },
  );
  typia.assert(thread);
  TestValidator.equals(
    "live thread is attached to the created post",
    thread.postId,
    post.id,
  );
  TestValidator.equals(
    "live thread access scope is invite_only",
    thread.accessScope,
    "invite_only",
  );

  // 4-1) Unauthenticated caller should be denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated caller cannot fetch invite_only live thread",
    async () => {
      await api.functional.econDiscuss.liveThreads.at(unauthConn, {
        liveThreadId: thread.id,
      });
    },
  );

  // 4-2) Authenticated different member should be denied
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const otherAuth = await api.functional.auth.member.join(connection, {
    body: joinBodyB,
  });
  typia.assert(otherAuth);

  await TestValidator.error(
    "different authenticated member cannot fetch invite_only live thread",
    async () => {
      await api.functional.econDiscuss.liveThreads.at(connection, {
        liveThreadId: thread.id,
      });
    },
  );
}
