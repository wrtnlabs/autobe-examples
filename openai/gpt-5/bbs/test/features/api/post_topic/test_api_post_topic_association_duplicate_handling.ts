import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostTopic";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

/**
 * Ensure duplicate post–topic association attempts are safely handled.
 *
 * Business flow
 *
 * 1. Admin joins and creates a curated topic
 * 2. Member joins and creates a post
 * 3. First attach: member attaches the topic to the post (success expected)
 * 4. Second attach (duplicate):
 *
 *    - Acceptable outcomes: a) API throws an error (conflict behavior), or b) API
 *         succeeds idempotently and returns the same association (same id)
 *
 * Validation
 *
 * - All responses pass typia.assert type checks
 * - First association references the correct post and topic ids
 * - Second attempt results in either an error or an idempotent result with the
 *   same association id
 */
export async function test_api_post_topic_association_duplicate_handling(
  connection: api.IConnection,
) {
  // 1) Admin join
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!1",
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(admin);

  // 1-2) Create curated topic as admin
  const topicCode = `topic-${RandomGenerator.alphaNumeric(12)}`;
  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: topicCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(topic);

  // 2) Member join (switches Authorization header to member automatically)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!1",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2-1) Member creates a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) First association: attach topic to post
  const first = await api.functional.econDiscuss.member.posts.topics.create(
    connection,
    {
      postId: post.id,
      body: {
        econ_discuss_topic_id: topic.id,
      } satisfies IEconDiscussPostTopic.ICreate,
    },
  );
  typia.assert(first);

  // Validate linkage correctness
  TestValidator.equals(
    "first association links to the correct post",
    first.econ_discuss_post_id,
    post.id,
  );
  TestValidator.equals(
    "first association links to the correct topic",
    first.econ_discuss_topic_id,
    topic.id,
  );

  // 4) Second association attempt (duplicate):
  // Accept either conflict error OR idempotent success returning the same association id
  let duplicateOutcome: "error" | "idempotent" | "unexpected" = "unexpected";
  try {
    const second = await api.functional.econDiscuss.member.posts.topics.create(
      connection,
      {
        postId: post.id,
        body: {
          econ_discuss_topic_id: topic.id,
        } satisfies IEconDiscussPostTopic.ICreate,
      },
    );
    typia.assert(second);

    // If success, ensure the returned association refers to the same post/topic
    TestValidator.equals(
      "second association links to the same post",
      second.econ_discuss_post_id,
      post.id,
    );
    TestValidator.equals(
      "second association links to the same topic",
      second.econ_discuss_topic_id,
      topic.id,
    );

    // Idempotent success is acceptable only when the association id matches
    if (second.id === first.id) duplicateOutcome = "idempotent";
    else duplicateOutcome = "unexpected";
  } catch (_e) {
    // Error on duplication is acceptable (conflict behavior)
    duplicateOutcome = "error";
  }

  TestValidator.predicate(
    "duplicate association must be handled by conflict or idempotency",
    duplicateOutcome !== "unexpected",
  );
}
