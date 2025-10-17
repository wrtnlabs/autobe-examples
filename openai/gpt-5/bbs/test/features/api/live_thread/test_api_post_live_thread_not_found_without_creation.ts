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
 * Live thread not-found when none exists for a post.
 *
 * Purpose
 *
 * - Ensure that requesting a live thread for a newly created post (that has no
 *   live thread) results in an error (not-found by policy) without leaking any
 *   partial data.
 *
 * Flow
 *
 * 1. Join as a member to obtain an authenticated session.
 * 2. Create a post with minimal valid fields (title, body).
 * 3. Attempt to fetch the post's live thread; expect the call to fail.
 * 4. Repeat the fetch to confirm idempotency: it must still fail.
 *
 * Notes
 *
 * - Per testing guidelines, validate only that an error occurs; do not assert
 *   specific HTTP status codes or error payload shapes.
 */
export async function test_api_post_live_thread_not_found_without_creation(
  connection: api.IConnection,
) {
  // 1) Authenticate as member (SDK injects Authorization header automatically)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // MinLength<8>
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      // avatar_uri omitted (optional)
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        // summary, scheduled_publish_at, topicIds omitted (all optional)
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Try to fetch live thread for the post — should fail (not-found)
  await TestValidator.error(
    "live thread must not exist immediately after post creation",
    async () => {
      await api.functional.econDiscuss.posts.live.at(connection, {
        postId: post.id,
      });
    },
  );

  // 4) Repeat the call to confirm idempotency: still fails
  await TestValidator.error(
    "repeated live thread lookup without creation should continue failing",
    async () => {
      await api.functional.econDiscuss.posts.live.at(connection, {
        postId: post.id,
      });
    },
  );
}
