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
 * Author creates a live thread for their post; duplicate creation is rejected.
 *
 * Steps
 *
 * 1. Join as a new member to obtain authenticated context
 * 2. Create a parent post and capture its id
 * 3. Create a live thread for the post with scheduled configuration
 * 4. Attempt to create the live thread again for the same post and expect error
 *
 * Validations
 *
 * - Created thread links to the correct post (postId)
 * - HostUserId matches authenticated member id
 * - AccessScope/expertOnly persisted from request
 * - ScheduledStartAt exists for scheduled setup (ISO validated by typia.assert)
 * - Second creation attempt triggers an error (conflict/idempotency handling)
 */
export async function test_api_live_thread_creation_by_author_with_duplicate_conflict(
  connection: api.IConnection,
) {
  // 1) Authenticate (join) as a new member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!", // >= 8 chars
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const auth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(auth);

  // 2) Create a parent post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 3) Create live thread for the post
  const accessScope: IELiveThreadAccessScope = "public";
  const scheduledStartAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 5 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const createLiveBody = {
    accessScope,
    expertOnly: false,
    state: "scheduled" as IELiveThreadState,
    scheduledStartAt,
    slowModeIntervalSeconds: 10,
  } satisfies IEconDiscussLiveThread.ICreate;
  const live: IEconDiscussLiveThread =
    await api.functional.econDiscuss.member.posts.live.create(connection, {
      postId: post.id,
      body: createLiveBody,
    });
  typia.assert(live);

  // Business validations
  TestValidator.equals(
    "live thread linked to the created post",
    live.postId,
    post.id,
  );
  TestValidator.equals(
    "host user id equals authenticated member id",
    live.hostUserId,
    auth.id,
  );
  TestValidator.equals(
    "access scope persisted as requested",
    live.accessScope,
    accessScope,
  );
  TestValidator.equals(
    "expertOnly persisted as requested",
    live.expertOnly,
    false,
  );
  TestValidator.predicate(
    "scheduledStartAt should be present for scheduled threads",
    live.scheduledStartAt !== null && live.scheduledStartAt !== undefined,
  );

  // 4) Duplicate creation attempt should fail
  const duplicateLiveBody = {
    accessScope,
    expertOnly: false,
    state: "scheduled" as IELiveThreadState,
    scheduledStartAt,
    slowModeIntervalSeconds: 10,
  } satisfies IEconDiscussLiveThread.ICreate;
  await TestValidator.error(
    "duplicate live thread creation must be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.live.create(connection, {
        postId: post.id,
        body: duplicateLiveBody,
      });
    },
  );
}
