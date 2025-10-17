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
 * Verify authentication is required to remove a post–topic association and that
 * an unauthenticated attempt does not change existing links.
 *
 * Business context:
 *
 * - Admin provisions a curated topic.
 * - Member authors a post and attaches the curated topic.
 * - Unauthenticated client attempts to DELETE the association; it must fail and
 *   the association must remain.
 *
 * Steps:
 *
 * 1. Admin join → create curated topic
 * 2. Member join → create post → attach topic
 * 3. Create unauthenticated connection → attempt erase → expect error
 * 4. Re-attach same topic (as member) → expect duplicate error (proves link still
 *    exists)
 */
export async function test_api_post_topic_association_remove_authentication_required(
  connection: api.IConnection,
) {
  // 1) Admin join → create curated topic
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(admin);

  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `eco-${RandomGenerator.alphaNumeric(10)}`,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(topic);

  // 2) Member join → create post → attach topic
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
        }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  const association =
    await api.functional.econDiscuss.member.posts.topics.create(connection, {
      postId: post.id,
      body: {
        econ_discuss_topic_id: topic.id,
      } satisfies IEconDiscussPostTopic.ICreate,
    });
  typia.assert(association);

  // 3) Create unauthenticated connection → attempt erase → expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated erase must fail", async () => {
    await api.functional.econDiscuss.member.posts.topics.erase(unauthConn, {
      postId: post.id,
      topicId: topic.id,
    });
  });

  // 4) Re-attach same topic (as member) → expect duplicate error (link still exists)
  await TestValidator.error(
    "duplicate association still rejected after failed unauthenticated delete",
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
