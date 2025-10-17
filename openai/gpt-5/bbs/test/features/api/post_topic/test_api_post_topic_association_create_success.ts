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
 * Attach a curated topic to a member-authored post (happy path).
 *
 * Steps
 *
 * 1. Admin joins to obtain admin scope for taxonomy operations
 * 2. Admin creates a curated topic (code/name/optional description)
 * 3. Member joins to obtain member scope
 * 4. Member creates a post (title/body)
 * 5. Member attaches the topic to the post via POST
 *    /econDiscuss/member/posts/{postId}/topics
 *
 * Validations
 *
 * - All responses pass typia.assert() (includes UUID/date-time format checks)
 * - Post.author_user_id equals authenticated member id
 * - Association reflects correct postId and topicId
 */
export async function test_api_post_topic_association_create_success(
  connection: api.IConnection,
) {
  // 1) Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;
  const adminAuth: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2) Admin creates a curated topic
  const topicBody = {
    code: `topic_${RandomGenerator.alphaNumeric(10)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussTopic.ICreate;
  const topic: IEconDiscussTopic =
    await api.functional.econDiscuss.admin.topics.create(connection, {
      body: topicBody,
    });
  typia.assert(topic);

  // 3) Member joins
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const memberAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(memberAuth);

  // 4) Member creates a post
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // Validate author ownership
  TestValidator.equals(
    "post author should equal authenticated member id",
    post.author_user_id,
    memberAuth.id,
  );

  // 5) Member attaches the topic to the post
  const assocBody = {
    econ_discuss_topic_id: topic.id,
  } satisfies IEconDiscussPostTopic.ICreate;
  const association: IEconDiscussPostTopic =
    await api.functional.econDiscuss.member.posts.topics.create(connection, {
      postId: post.id,
      body: assocBody,
    });
  typia.assert(association);

  // Association validations
  TestValidator.equals(
    "association refers to the correct post",
    association.econ_discuss_post_id,
    post.id,
  );
  TestValidator.equals(
    "association refers to the correct topic",
    association.econ_discuss_topic_id,
    topic.id,
  );
}
