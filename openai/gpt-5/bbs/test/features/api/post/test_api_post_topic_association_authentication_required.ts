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
 * Authentication boundary for creating post–topic associations.
 *
 * This test ensures that adding a topic to a post requires authentication. It
 * prepares an admin-created topic and a member-authored post, then:
 *
 * 1. Tries to attach the topic without Authorization (must error)
 * 2. Attaches the topic with valid member Authorization (must succeed)
 *
 * Steps
 *
 * 1. Admin joins (issues admin token) to create a curated topic
 * 2. Admin creates a topic
 * 3. Member joins (issues member token)
 * 4. Member creates a post
 * 5. Unauthenticated attempt to attach topic to post → expect error
 * 6. Authenticated attach succeeds and references correct post/topic IDs
 */
export async function test_api_post_topic_association_authentication_required(
  connection: api.IConnection,
) {
  // 1) Admin joins
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(admin);

  // 2) Admin creates a curated topic
  const topicCode: string = `topic_${RandomGenerator.alphaNumeric(8)}`;
  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: topicCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(topic);

  // 3) Member joins
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 4) Member creates a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 5) Attempt unauthenticated association → must error (do not assert status code)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated association attempt should fail",
    async () => {
      await api.functional.econDiscuss.member.posts.topics.create(unauthConn, {
        postId: post.id,
        body: {
          econ_discuss_topic_id: topic.id,
        } satisfies IEconDiscussPostTopic.ICreate,
      });
    },
  );

  // 6) Control: authenticated association should succeed
  const assoc = await api.functional.econDiscuss.member.posts.topics.create(
    connection,
    {
      postId: post.id,
      body: {
        econ_discuss_topic_id: topic.id,
      } satisfies IEconDiscussPostTopic.ICreate,
    },
  );
  typia.assert(assoc);

  // Validate association links correct entities
  TestValidator.equals(
    "association links to the created post",
    assoc.econ_discuss_post_id,
    post.id,
  );
  TestValidator.equals(
    "association links to the created topic",
    assoc.econ_discuss_topic_id,
    topic.id,
  );
}
