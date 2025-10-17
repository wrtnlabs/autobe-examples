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
 * Publicly list topics attached to a post without authentication.
 *
 * This test covers the end-to-end workflow to verify that curated topics
 * attached to a member-authored post are publicly retrievable via the paginated
 * listing endpoint without requiring Authorization.
 *
 * Steps
 *
 * 1. Register an admin user (auth.admin.join) to enable topic creation.
 * 2. Create a curated topic (econDiscuss.admin.topics.create).
 * 3. Register a member user (auth.member.join).
 * 4. Create a post authored by the member (econDiscuss.member.posts.create).
 * 5. Attach the topic to the post (econDiscuss.member.posts.topics.create).
 * 6. Clone an unauthenticated connection and call the public listing
 *    (econDiscuss.posts.topics.index) to verify the topic appears in the
 *    paginated results.
 *
 * Validations
 *
 * - The listing returns a paginated container.
 * - The attached topic is present in results and id/code/name match the created
 *   topic.
 * - No Authorization header is required for the listing.
 */
export async function test_api_post_topics_public_list_attached(
  connection: api.IConnection,
) {
  // 1) Admin joins (admin scope for topic creation)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2) Admin creates a curated topic
  const createTopicBody = {
    code: `${RandomGenerator.alphabets(5)}-${RandomGenerator.alphaNumeric(4)}`,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies IEconDiscussTopic.ICreate;
  const topic = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: createTopicBody,
    },
  );
  typia.assert(topic);

  // 3) Member joins
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(memberAuth);

  // 4) Member creates a post
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: createPostBody,
    },
  );
  typia.assert(post);

  // 5) Attach the topic to the post
  const attachBody = {
    econ_discuss_topic_id: topic.id,
  } satisfies IEconDiscussPostTopic.ICreate;
  const attached = await api.functional.econDiscuss.member.posts.topics.create(
    connection,
    {
      postId: post.id,
      body: attachBody,
    },
  );
  typia.assert(attached);

  // 6) Publicly list topics for the post (no Authorization header)
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const page = await api.functional.econDiscuss.posts.topics.index(publicConn, {
    postId: post.id,
  });
  typia.assert(page);

  // Validate pagination container has at least one record
  TestValidator.predicate(
    "paginated listing must contain at least one record",
    page.pagination.records >= 1,
  );

  // Validate attached topic is included and summary fields match
  const found = page.data.find((elem) => elem.id === topic.id);
  TestValidator.predicate(
    "attached topic must be present in listing",
    found !== undefined,
  );
  const present = typia.assert<IEconDiscussTopic.ISummary>(found!);
  TestValidator.equals("attached topic id matches", present.id, topic.id);
  TestValidator.equals("attached topic code matches", present.code, topic.code);
  TestValidator.equals("attached topic name matches", present.name, topic.name);
}
