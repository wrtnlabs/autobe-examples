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

export async function test_api_post_topic_association_archived_topic_rejected(
  connection: api.IConnection,
) {
  // 1) Admin joins (authenticate as admin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12), // >= 8 chars
      display_name: RandomGenerator.name(2),
      // Optional preferences omitted
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2) Admin creates a curated topic
  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `topic-${RandomGenerator.alphaNumeric(12)}`,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(topic);

  // 3) Admin archives the topic (soft delete)
  await api.functional.econDiscuss.admin.topics.erase(connection, {
    topicId: topic.id,
  });

  // 4) Member joins (switch auth context to member)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberAuth);

  // 5) Member creates a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 14,
        }),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        // scheduled_publish_at omitted
        // topicIds omitted to ensure attach is attempted separately
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 6) Attempt to attach the archived topic to the post -> must fail
  await TestValidator.error(
    "archived topic cannot be associated to a post",
    async () => {
      await api.functional.econDiscuss.member.posts.topics.create(connection, {
        postId: post.id,
        body: {
          econ_discuss_topic_id: topic.id,
        } satisfies IEconDiscussPostTopic.ICreate,
      });
    },
  );
}
