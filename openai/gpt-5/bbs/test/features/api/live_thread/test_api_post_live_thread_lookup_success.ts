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
 * Lookup the live thread for a post (success path).
 *
 * Business flow:
 *
 * 1. Join as a member to obtain an authenticated session.
 * 2. Create a post as that member (host post for the live thread).
 * 3. Create a live thread attached 1:1 to the post (public scope, not
 *    expert-only).
 * 4. GET the live thread by postId and validate core fields and relationships.
 *
 * Validations:
 *
 * - Fetched.postId matches created post.id (1:1 binding)
 * - Fetched.hostUserId matches the authenticated member id
 * - State/accessScope/expertOnly match the creation input
 * - ArchivedAt is not set (null or undefined) for a fresh thread
 * - Attempting to create a second live thread on the same post results in an
 *   error (uniqueness)
 *
 * Notes:
 *
 * - Do not touch connection.headers; SDK manages Authorization on join.
 * - Typia.assert() fully validates types and ISO 8601 timestamp formats.
 */
export async function test_api_post_live_thread_lookup_success(
  connection: api.IConnection,
) {
  // 1) Authenticate member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!", // >= 8 chars per DTO
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a host post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // Author should be the joined member
  TestValidator.equals(
    "post.author_user_id equals joined member id",
    post.author_user_id,
    member.id,
  );

  // 3) Create a live thread for the post (public, not expert-only)
  const created = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: {
        state: "waiting",
        expertOnly: false,
        accessScope: "public",
        slowModeIntervalSeconds: 5,
      } satisfies IEconDiscussLiveThread.ICreate,
    },
  );
  typia.assert(created);

  // 4) GET the live thread by postId
  const fetched = await api.functional.econDiscuss.posts.live.at(connection, {
    postId: post.id,
  });
  typia.assert(fetched);

  // Core relationship validations
  TestValidator.equals(
    "live thread belongs to created post",
    fetched.postId,
    post.id,
  );
  TestValidator.equals(
    "hostUserId equals authenticated member id",
    fetched.hostUserId,
    member.id,
  );

  // Field parity validations
  TestValidator.equals(
    "state preserved across creation and fetch",
    fetched.state,
    created.state,
  );
  TestValidator.equals("accessScope is public", fetched.accessScope, "public");
  TestValidator.equals("expertOnly is false", fetched.expertOnly, false);
  TestValidator.equals(
    "slowModeIntervalSeconds preserved",
    fetched.slowModeIntervalSeconds,
    created.slowModeIntervalSeconds,
  );

  // Fresh thread should not be archived
  TestValidator.predicate(
    "archivedAt is null or undefined for a fresh live thread",
    fetched.archivedAt === null || fetched.archivedAt === undefined,
  );

  // Uniqueness: attempting to create another live thread for the same post must fail
  await TestValidator.error(
    "cannot create duplicate live thread for the same post (1:1 uniqueness)",
    async () => {
      await api.functional.econDiscuss.member.posts.live.create(connection, {
        postId: post.id,
        body: {
          accessScope: "public",
        } satisfies IEconDiscussLiveThread.ICreate,
      });
    },
  );
}
