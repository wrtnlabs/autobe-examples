import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Validate scheduled publishing at creation time for member-authored posts.
 *
 * Steps:
 *
 * 1. Register a member to obtain an authenticated session.
 * 2. Create a post with scheduled_publish_at in the future.
 * 3. Validate server persists scheduled_publish_at and keeps published_at null.
 * 4. Validate author_user_id matches the authenticated member id and content
 *    echoes back.
 * 5. Boundary: unauthenticated client cannot create a post (generic error
 *    expectation only).
 */
export async function test_api_post_creation_with_scheduling_future_visibility(
  connection: api.IConnection,
) {
  // 1) Register member (authentication dependency)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinBody = {
    email,
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert<IEconDiscussMember.IAuthorized>(authorized);

  // 2) Prepare a future schedule time (ISO string)
  const futureAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new Date(Date.now() + 60 * 60 * 1000).toISOString()); // +1 hour

  // 3) Create a scheduled post
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 12 }),
    scheduled_publish_at: futureAt,
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    { body: createBody },
  );
  typia.assert<IEconDiscussPost>(post);

  // 4) Validate core fields and scheduling semantics
  TestValidator.equals(
    "author bound to authenticated member",
    post.author_user_id,
    authorized.id,
  );
  TestValidator.equals("title persisted", post.title, createBody.title);
  TestValidator.equals("body persisted", post.body, createBody.body);
  TestValidator.equals(
    "scheduled_publish_at persisted",
    post.scheduled_publish_at,
    futureAt,
  );
  TestValidator.equals(
    "published_at must be null at creation when scheduled",
    post.published_at,
    null,
  );
  await TestValidator.predicate(
    "scheduled time is in the future",
    async () => new Date(futureAt).getTime() > Date.now(),
  );

  // 5) Boundary: unauthenticated actor cannot create posts
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const otherFutureAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()); // +2 hours
  const unauthBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    scheduled_publish_at: otherFutureAt,
  } satisfies IEconDiscussPost.ICreate;
  await TestValidator.error(
    "unauthenticated member cannot create posts",
    async () => {
      await api.functional.econDiscuss.member.posts.create(unauthConn, {
        body: unauthBody,
      });
    },
  );
}
