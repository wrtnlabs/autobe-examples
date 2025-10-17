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
 * Verify idempotent removal of a post–topic association and effective
 * unlinking.
 *
 * Steps
 *
 * 1. Admin joins and creates a curated topic.
 * 2. Member joins and creates a post.
 * 3. Member attaches the topic to the post and validates association.
 * 4. Member deletes the association (first DELETE) — must succeed.
 * 5. Member deletes the same association again (second DELETE) — may either
 *    succeed idempotently or throw an HttpError (e.g., 404). Do not assert
 *    status codes; both behaviors are acceptable.
 * 6. Member re‑attaches the same topic to the post to prove the prior removal took
 *    effect, and validates association.
 * 7. Optional cleanup: try to erase again and ignore any error.
 */
export async function test_api_post_topic_association_remove_idempotency(
  connection: api.IConnection,
) {
  // 1) Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2) Admin creates a curated topic
  const topicCreate = {
    code: `topic-${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussTopic.ICreate;
  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    { body: topicCreate },
  );
  typia.assert(topic);
  TestValidator.equals(
    "created topic code echoes input",
    topic.code,
    topicCreate.code,
  );
  TestValidator.equals(
    "created topic name echoes input",
    topic.name,
    topicCreate.name,
  );

  // 3) Member joins
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(member);

  // 4) Member creates a post
  const postCreate = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postCreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "created post title echoes input",
    post.title,
    postCreate.title,
  );
  TestValidator.equals(
    "created post body echoes input",
    post.body,
    postCreate.body,
  );

  // 5) Attach topic to post
  const assocCreate = {
    econ_discuss_topic_id: topic.id,
  } satisfies IEconDiscussPostTopic.ICreate;
  const assoc1 = await api.functional.econDiscuss.member.posts.topics.create(
    connection,
    { postId: post.id, body: assocCreate },
  );
  typia.assert(assoc1);
  TestValidator.equals(
    "association topic id matches topic.id",
    assoc1.econ_discuss_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "association post id matches post.id",
    assoc1.econ_discuss_post_id,
    post.id,
  );

  // 6) First DELETE — must succeed (void)
  await api.functional.econDiscuss.member.posts.topics.erase(connection, {
    postId: post.id,
    topicId: topic.id,
  });

  // 7) Second DELETE — accept both idempotent success or a not-found style error
  try {
    await api.functional.econDiscuss.member.posts.topics.erase(connection, {
      postId: post.id,
      topicId: topic.id,
    });
  } catch (_exp) {
    // Acceptable per policy; do not assert specific HTTP status code
  }

  // 8) Re-attach to prove effective removal
  const assoc2 = await api.functional.econDiscuss.member.posts.topics.create(
    connection,
    {
      postId: post.id,
      body: {
        econ_discuss_topic_id: topic.id,
      } satisfies IEconDiscussPostTopic.ICreate,
    },
  );
  typia.assert(assoc2);
  TestValidator.equals(
    "re-attached association topic id matches",
    assoc2.econ_discuss_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "re-attached association post id matches",
    assoc2.econ_discuss_post_id,
    post.id,
  );

  // 9) Optional cleanup: erase again and ignore errors
  try {
    await api.functional.econDiscuss.member.posts.topics.erase(connection, {
      postId: post.id,
      topicId: topic.id,
    });
  } catch {
    // ignore
  }
}
