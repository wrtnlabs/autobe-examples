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
 * Fetch a live discussion thread by ID and validate linkage and controls.
 *
 * Business context:
 *
 * - A member creates a post, then attaches a live thread to it. Clients must be
 *   able to fetch the live thread by its ID in public scope.
 *
 * Steps:
 *
 * 1. Register a member (join) to authenticate.
 * 2. Create a Post as the authenticated member.
 * 3. Create a Live Thread for the Post with accessScope="public" and
 *    expertOnly=false.
 * 4. Fetch the Live Thread by ID and assert core metadata and linkages.
 */
export async function test_api_live_thread_fetch_by_id(
  connection: api.IConnection,
) {
  // 1) Register member to authenticate (SDK sets Authorization automatically)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Create a Post as the authenticated member
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
    summary: null,
    scheduled_publish_at: null,
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post author is authenticated member",
    post.author_user_id,
    authorized.id,
  );

  // 3) Create a live thread for the post
  const liveCreateBody = {
    state: "waiting",
    accessScope: "public",
    expertOnly: false,
    scheduledStartAt: null,
    slowModeIntervalSeconds: null,
  } satisfies IEconDiscussLiveThread.ICreate;
  const created: IEconDiscussLiveThread =
    await api.functional.econDiscuss.member.posts.live.create(connection, {
      postId: post.id,
      body: liveCreateBody,
    });
  typia.assert(created);

  // 4) Fetch by ID and validate metadata/linkage
  const fetched: IEconDiscussLiveThread =
    await api.functional.econDiscuss.liveThreads.at(connection, {
      liveThreadId: created.id,
    });
  typia.assert(fetched);

  TestValidator.equals(
    "returned thread id matches requested id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched thread belongs to created post",
    fetched.postId,
    post.id,
  );
  TestValidator.equals(
    "host user id equals authenticated member id",
    fetched.hostUserId,
    authorized.id,
  );
  TestValidator.equals(
    "access scope equals 'public'",
    fetched.accessScope,
    "public",
  );
  TestValidator.equals("expertOnly equals false", fetched.expertOnly, false);
  TestValidator.equals(
    "scheduledStartAt reflects creation value (may be null/undefined)",
    fetched.scheduledStartAt,
    liveCreateBody.scheduledStartAt,
  );
  TestValidator.equals(
    "slowModeIntervalSeconds reflects creation value (may be null/undefined)",
    fetched.slowModeIntervalSeconds,
    liveCreateBody.slowModeIntervalSeconds,
  );
}
