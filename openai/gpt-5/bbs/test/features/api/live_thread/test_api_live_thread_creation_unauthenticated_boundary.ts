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

export async function test_api_live_thread_creation_unauthenticated_boundary(
  connection: api.IConnection,
) {
  /**
   * Scenario: Protected live thread creation rejects unauthenticated requests.
   *
   * Steps:
   *
   * 1. Join as a new member to obtain authentication and create a parent post.
   * 2. Attempt POST /econDiscuss/member/posts/{postId}/live with NO auth headers →
   *    expect error.
   * 3. Retry the same creation WITH authentication → expect success.
   *
   * Validations:
   *
   * - Unauthorized attempt throws.
   * - Authorized attempt returns IEconDiscussLiveThread with correct postId and
   *   hostUserId.
   * - No side-effect from unauthorized attempt (authorized creation still
   *   succeeds).
   */

  // 1) Register (join) a new member → authenticated session stored by SDK
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a parent post as the authenticated member
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        scheduled_publish_at: null,
        // topicIds omitted (optional)
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // Prepare a fresh unauthenticated connection (DO NOT touch original headers)
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // Define a valid live thread creation body
  const liveCreateBody = {
    state: "waiting" as IELiveThreadState,
    expertOnly: false,
    accessScope: "public" as IELiveThreadAccessScope,
    scheduledStartAt: new Date().toISOString(),
    slowModeIntervalSeconds: 15,
  } satisfies IEconDiscussLiveThread.ICreate;

  // 3) Unauthorized attempt must fail
  await TestValidator.error(
    "unauthenticated live thread create should fail",
    async () => {
      await api.functional.econDiscuss.member.posts.live.create(
        unauthenticated,
        {
          postId: post.id,
          body: liveCreateBody,
        },
      );
    },
  );

  // 4) Authorized attempt should succeed
  const live = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: liveCreateBody,
    },
  );
  typia.assert(live);

  // Validate linkage and ownership
  TestValidator.equals(
    "live thread attached to the correct post",
    live.postId,
    post.id,
  );
  TestValidator.equals(
    "live thread hostUserId equals authenticated member id",
    live.hostUserId,
    member.id,
  );
}
