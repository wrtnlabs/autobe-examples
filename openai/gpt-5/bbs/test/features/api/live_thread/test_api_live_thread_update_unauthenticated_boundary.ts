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
 * Live thread update authentication boundary.
 *
 * Business goal
 *
 * - Ensure that PUT /econDiscuss/member/posts/{postId}/live rejects
 *   unauthenticated requests and accepts authenticated ones, persisting only
 *   intended changes.
 *
 * Steps
 *
 * 1. Join as a member (tokens auto-applied by SDK).
 * 2. Create a post as the authenticated member.
 * 3. Create a live thread for that post.
 * 4. Attempt to update the live thread WITHOUT Authorization using a cloned
 *    unauthenticated connection; expect an error (no status code assertion).
 * 5. Update the live thread WITH Authorization; expect success and persisted
 *    changes.
 *
 * Validations
 *
 * - Typia.assert() for all responses to guarantee schema/format (UUID, ISO
 *   dates).
 * - TestValidator.error() for unauthenticated attempt (no status code checks).
 * - Business field persistence after authenticated update:
 *
 *   - AccessScope and slowModeIntervalSeconds match request.
 *   - PostId remains the same.
 *   - UpdatedAt changes relative to the originally created live thread.
 */
export async function test_api_live_thread_update_unauthenticated_boundary(
  connection: api.IConnection,
) {
  // 1) Join as member (Authorization auto-injected by SDK)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create a post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
    scheduled_publish_at: null,
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  // 3) Create a live thread for the post
  const liveCreateBody = {
    state: "waiting",
    expertOnly: false,
    accessScope: "public",
    scheduledStartAt: null,
    slowModeIntervalSeconds: 5,
  } satisfies IEconDiscussLiveThread.ICreate;
  const createdLive = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: liveCreateBody,
    },
  );
  typia.assert(createdLive);

  // 4) Unauthenticated update attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const unauthUpdateBody = {
    slowModeIntervalSeconds: 15,
  } satisfies IEconDiscussLiveThread.IUpdate;
  await TestValidator.error(
    "unauthenticated update must be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.live.update(unauthConn, {
        postId: post.id,
        body: unauthUpdateBody,
      });
    },
  );

  // 5) Authenticated update success
  const authUpdateBody = {
    accessScope: "followers_only",
    slowModeIntervalSeconds: 10,
  } satisfies IEconDiscussLiveThread.IUpdate;
  const updated = await api.functional.econDiscuss.member.posts.live.update(
    connection,
    {
      postId: post.id,
      body: authUpdateBody,
    },
  );
  typia.assert(updated);

  // Validations: post linkage, persisted fields, timestamp change
  TestValidator.equals(
    "live thread belongs to the same post",
    updated.postId,
    post.id,
  );
  TestValidator.equals(
    "slow mode interval updated by authorized request",
    updated.slowModeIntervalSeconds,
    authUpdateBody.slowModeIntervalSeconds,
  );
  TestValidator.equals(
    "access scope updated by authorized request",
    updated.accessScope,
    authUpdateBody.accessScope,
  );
  TestValidator.notEquals(
    "updatedAt should change after successful update",
    updated.updatedAt,
    createdLive.updatedAt,
  );
}
