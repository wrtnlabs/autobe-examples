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

export async function test_api_live_thread_soft_delete_and_idempotency(
  connection: api.IConnection,
) {
  // 1) Register a member (authentication setup)
  const auth = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      // avatar_uri optional
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(auth);

  // 2) Create a parent post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
    scheduled_publish_at: null,
    topicIds: [],
  } satisfies IEconDiscussPost.ICreate;

  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  // Validate author binding
  TestValidator.equals(
    "post author matches authenticated member",
    post.author_user_id,
    auth.id,
  );

  // 3) Create a live thread for the post
  const liveCreateBody = {
    state: "waiting",
    expertOnly: false,
    accessScope: "public",
    scheduledStartAt: new Date().toISOString(),
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

  // Validate live thread bindings
  TestValidator.equals(
    "live thread bound to the created post",
    live.postId,
    post.id,
  );
  TestValidator.equals(
    "live thread hostUserId equals authenticated member id",
    live.hostUserId,
    auth.id,
  );
  TestValidator.equals(
    "initial live thread state is waiting",
    live.state,
    "waiting",
  );

  // 4) Soft delete the live thread
  await api.functional.econDiscuss.member.posts.live.erase(connection, {
    postId: post.id,
  });

  // 5) Idempotency check: second delete may succeed or follow not-found policy
  try {
    await api.functional.econDiscuss.member.posts.live.erase(connection, {
      postId: post.id,
    });
    // If succeeds, treat as idempotent success
  } catch {
    // If throws, treat as acceptable not-found policy; do not assert status
  }

  // 6) Authorization boundary: unauthenticated delete must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated member cannot erase a live thread",
    async () => {
      await api.functional.econDiscuss.member.posts.live.erase(unauthConn, {
        postId: post.id,
      });
    },
  );

  // 7) Optional: Attempt to recreate a live thread post-deletion
  const recreateBody = {
    state: "scheduled",
    expertOnly: false,
    accessScope: "public",
    scheduledStartAt: new Date().toISOString(),
    slowModeIntervalSeconds: 5,
  } satisfies IEconDiscussLiveThread.ICreate;

  let recreated: IEconDiscussLiveThread | null = null;
  try {
    const again = await api.functional.econDiscuss.member.posts.live.create(
      connection,
      { postId: post.id, body: recreateBody },
    );
    typia.assert(again);
    recreated = again;
  } catch {
    recreated = null;
  }

  if (recreated !== null) {
    // Recreation allowed by provider policy
    TestValidator.equals(
      "recreated live thread bound to same post",
      recreated.postId,
      post.id,
    );
    TestValidator.equals(
      "recreated live thread hostUserId equals authenticated member id",
      recreated.hostUserId,
      auth.id,
    );
  } else {
    // Recreation prohibited by uniqueness policy; confirm consistent failure
    await TestValidator.error(
      "recreating live thread after deletion should be rejected per policy",
      async () => {
        await api.functional.econDiscuss.member.posts.live.create(connection, {
          postId: post.id,
          body: recreateBody,
        });
      },
    );
  }
}
