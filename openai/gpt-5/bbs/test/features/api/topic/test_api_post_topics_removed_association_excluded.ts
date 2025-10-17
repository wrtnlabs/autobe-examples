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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";

/**
 * Verify that removed (soft-deleted) post–topic associations are excluded from
 * public listing.
 *
 * Business context:
 *
 * - Topics are curated by admins and can be attached to member-authored posts via
 *   a junction table.
 * - Removing an association should mark it retired (deleted_at) and exclude it
 *   from public read APIs.
 *
 * Steps:
 *
 * 1. Admin joins to gain admin scope.
 * 2. Admin creates two topics (A, B).
 * 3. Member joins to switch auth context.
 * 4. Member creates a post.
 * 5. Member attaches topic A and B to the post.
 * 6. Member removes association for topic A only.
 * 7. GET /econDiscuss/posts/{postId}/topics without authentication.
 *
 *    - Validate topic A is excluded and topic B remains.
 */
export async function test_api_post_topics_removed_association_excluded(
  connection: api.IConnection,
) {
  // 1) Admin joins (establish admin scope for topic creation)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!2025", // >= 8 chars
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: undefined,
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2) Admin creates two curated topics
  const topicA = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `topic-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(topicA);

  const topicB = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `topic-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(topicB);

  // 3) Member joins (switch auth to member for post/associations)
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "S3curePwd!",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: undefined,
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberJoin);

  // 4) Member creates a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 14,
        }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        scheduled_publish_at: undefined,
        topicIds: undefined, // attach via association endpoints
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 5) Member attaches both topics to the post
  const assocA = await api.functional.econDiscuss.member.posts.topics.create(
    connection,
    {
      postId: post.id,
      body: {
        econ_discuss_topic_id: topicA.id,
      } satisfies IEconDiscussPostTopic.ICreate,
    },
  );
  typia.assert(assocA);

  const assocB = await api.functional.econDiscuss.member.posts.topics.create(
    connection,
    {
      postId: post.id,
      body: {
        econ_discuss_topic_id: topicB.id,
      } satisfies IEconDiscussPostTopic.ICreate,
    },
  );
  typia.assert(assocB);

  // 6) Member removes association for topic A only (soft-delete)
  await api.functional.econDiscuss.member.posts.topics.erase(connection, {
    postId: post.id,
    topicId: topicA.id,
  });

  // 7) Unauthenticated GET listing should exclude removed association
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const page = await api.functional.econDiscuss.posts.topics.index(unauthConn, {
    postId: post.id,
  });
  typia.assert(page);

  // Business validations: topicA excluded, topicB present
  const ids = page.data.map((t) => t.id);
  TestValidator.predicate(
    "removed topic association must be excluded from public listing",
    ids.includes(topicA.id) === false,
  );
  TestValidator.predicate(
    "active topic association must remain in public listing",
    ids.includes(topicB.id) === true,
  );
}
