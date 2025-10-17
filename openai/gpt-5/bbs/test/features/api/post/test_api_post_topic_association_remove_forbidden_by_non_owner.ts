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
 * Non-owner cannot remove another member's post–topic association.
 *
 * Steps:
 *
 * 1. Admin joins and creates a curated topic.
 * 2. Member A joins and creates a post.
 * 3. Member A attaches the topic to the post.
 * 4. Member B joins (non-owner).
 * 5. Member B attempts to DELETE the association and fails (authorization
 *    boundary).
 *
 * Validations:
 *
 * - Types of all non-void responses are asserted with typia.assert().
 * - The post’s author is Member A.
 * - Member B’s deletion attempt raises an error (no status code assertion).
 */
export async function test_api_post_topic_association_remove_forbidden_by_non_owner(
  connection: api.IConnection,
) {
  // 1) Admin joins
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(admin);

  // 2) Admin creates a curated topic
  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `ed-${RandomGenerator.alphaNumeric(12)}`,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(topic);

  // 3) Member A joins (authorization switches to Member A)
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberA);

  // 4) Member A creates a post
  const postA = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 16,
        }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(postA);

  // Confirm author is Member A
  TestValidator.equals(
    "post author should be Member A",
    postA.author_user_id,
    memberA.id,
  );

  // 5) Member A attaches the topic to the post
  const association =
    await api.functional.econDiscuss.member.posts.topics.create(connection, {
      postId: postA.id,
      body: {
        econ_discuss_topic_id: topic.id,
      } satisfies IEconDiscussPostTopic.ICreate,
    });
  typia.assert(association);

  // 6) Member B joins (authorization switches to Member B)
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberB);

  // 7) Member B attempts to delete the association and must fail
  await TestValidator.error(
    "non-owner cannot remove topic association from another member's post",
    async () => {
      await api.functional.econDiscuss.member.posts.topics.erase(connection, {
        postId: postA.id,
        topicId: topic.id,
      });
    },
  );
}
