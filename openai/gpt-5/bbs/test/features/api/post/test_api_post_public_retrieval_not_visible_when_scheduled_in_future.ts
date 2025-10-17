import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

export async function test_api_post_public_retrieval_not_visible_when_scheduled_in_future(
  connection: api.IConnection,
) {
  // 1) Join as member (authentication)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123", // >= 8 chars per MinLength<8>
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a post with future scheduled_publish_at
  const scheduledAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000, // 1 hour in the future
  ).toISOString() as string & tags.Format<"date-time">;

  const created = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
        scheduled_publish_at: scheduledAt,
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(created);

  // Validate business precondition: scheduled_publish_at exists and is in the future
  const scheduled = typia.assert<string & tags.Format<"date-time">>(
    created.scheduled_publish_at!,
  );
  const scheduledMs = new Date(scheduled).getTime();
  const nowMs = Date.now();
  TestValidator.predicate(
    "scheduled_publish_at should be in the future",
    scheduledMs > nowMs,
  );

  // 3) Prepare unauthenticated connection (do not touch original headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Public retrieval must fail for future-scheduled (not yet visible) post
  await TestValidator.error(
    "public GET of future-scheduled post should be denied",
    async () => {
      await api.functional.econDiscuss.posts.at(unauthConn, {
        postId: created.id,
      });
    },
  );
}
