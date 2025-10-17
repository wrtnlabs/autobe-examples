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

export async function test_api_post_topic_association_remove_success(
  connection: api.IConnection,
) {
  /**
   * Member removes a post–topic association successfully (soft-delete semantics
   * validated by subsequent failure on repeat deletion).
   *
   * Steps:
   *
   * 1. Admin joins and creates a curated topic.
   * 2. Member joins and creates a post.
   * 3. Member attaches the topic to the post.
   * 4. Member deletes the association.
   * 5. Verify removal by asserting a second delete attempt fails.
   */
  // 1) Admin joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "password-1234",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2) Admin creates a curated topic
  const topicCode = `topic-${RandomGenerator.alphaNumeric(10)}`;
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

  // 3) Member joins (switches Authorization to member)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password-1234",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberAuth);

  // 4) Member creates a host post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 5) Attach topic to the post
  const association =
    await api.functional.econDiscuss.member.posts.topics.create(connection, {
      postId: post.id,
      body: {
        econ_discuss_topic_id: topic.id,
      } satisfies IEconDiscussPostTopic.ICreate,
    });
  typia.assert(association);
  TestValidator.equals(
    "association is linked to the correct post",
    association.econ_discuss_post_id,
    post.id,
  );
  TestValidator.equals(
    "association is linked to the correct topic",
    association.econ_discuss_topic_id,
    topic.id,
  );

  // 6) Remove the association (should complete without throwing)
  await api.functional.econDiscuss.member.posts.topics.erase(connection, {
    postId: post.id,
    topicId: topic.id,
  });

  // 7) Second removal must fail since association no longer exists
  await TestValidator.error(
    "second removal should fail as association no longer exists",
    async () => {
      await api.functional.econDiscuss.member.posts.topics.erase(connection, {
        postId: post.id,
        topicId: topic.id,
      });
    },
  );
}
