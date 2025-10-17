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
 * Authentication boundary for deleting a live thread.
 *
 * Business objective: Ensure unauthenticated requests cannot delete a post’s
 * live thread and produce no side-effects. Also confirm that an authenticated
 * request can delete the live thread, after which a new live thread can be
 * created again for the same post.
 *
 * Steps:
 *
 * 1. Join as a member (issuing tokens automatically managed by SDK)
 * 2. Create a post as the authenticated member
 * 3. Create a live thread attached to that post
 * 4. Attempt to delete with an unauthenticated connection (expect error)
 * 5. Verify no side-effect by asserting duplicate creation still fails (thread
 *    still exists)
 * 6. Delete with the authenticated connection (success)
 * 7. Verify lifecycle by creating a new live thread again (success, different id),
 *    then cleanup
 */
export async function test_api_live_thread_delete_unauthenticated_boundary(
  connection: api.IConnection,
) {
  // 1) Register a member and obtain authenticated context
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  // 2) Create a post as this member
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post author matches authenticated member",
    post.author_user_id,
    authorized.id,
  );

  // 3) Create a live thread for the post
  const liveCreateBody = {
    state: "live",
    accessScope: "public",
    slowModeIntervalSeconds: 3,
  } satisfies IEconDiscussLiveThread.ICreate;
  const live = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: liveCreateBody,
    },
  );
  typia.assert(live);
  TestValidator.equals(
    "live thread postId equals post id",
    live.postId,
    post.id,
  );
  TestValidator.equals(
    "live thread hostUserId equals member id",
    live.hostUserId,
    authorized.id,
  );

  // 4) Attempt delete with an unauthenticated connection (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated delete must be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.live.erase(unauthConn, {
        postId: post.id,
      });
    },
  );

  // 5) Verify no side-effects: duplicate creation should still fail while original exists
  await TestValidator.error(
    "duplicate live thread creation while existing must fail",
    async () => {
      await api.functional.econDiscuss.member.posts.live.create(connection, {
        postId: post.id,
        body: { state: "live" } satisfies IEconDiscussLiveThread.ICreate,
      });
    },
  );

  // 6) Delete with authenticated connection (success)
  await api.functional.econDiscuss.member.posts.live.erase(connection, {
    postId: post.id,
  });

  // 7) Verify lifecycle: can create a new live thread again
  const liveAgain = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: {
        state: "waiting",
        accessScope: "public",
      } satisfies IEconDiscussLiveThread.ICreate,
    },
  );
  typia.assert(liveAgain);
  TestValidator.notEquals(
    "newly created live thread id differs from previous",
    liveAgain.id,
    live.id,
  );
  TestValidator.equals(
    "new live thread postId still equals post id",
    liveAgain.postId,
    post.id,
  );

  // Cleanup: retire the re-created live thread
  await api.functional.econDiscuss.member.posts.live.erase(connection, {
    postId: post.id,
  });
}
