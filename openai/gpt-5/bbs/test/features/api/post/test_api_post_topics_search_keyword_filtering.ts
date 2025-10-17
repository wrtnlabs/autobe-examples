import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussPostTopicSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostTopicSort";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostTopic";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";

/**
 * Validate keyword filtering over topics attached to a post (public search).
 *
 * Flow:
 *
 * 1. Admin joins and creates two curated topics: "Macro" and "Labor" (unique
 *    codes).
 * 2. Member joins and creates a post.
 * 3. Member attaches both topics to the post.
 * 4. Call PATCH /econDiscuss/posts/{postId}/topics without Authorization using
 *    q="Mac".
 *
 * Validations:
 *
 * - Response adheres to IPageIEconDiscussTopic.ISummary.
 * - Result contains the matching topic ("Macro") and excludes the non-matching
 *   one ("Labor").
 * - Endpoint can be called publicly (unauthenticated connection clone).
 */
export async function test_api_post_topics_search_keyword_filtering(
  connection: api.IConnection,
) {
  // 1) Admin joins (able to create curated topics)
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // >= 8
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2) Admin creates two curated topics: Macro, Labor
  const macro = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `macro-${RandomGenerator.alphaNumeric(8)}`,
        name: "Macro",
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(macro);

  const labor = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: {
        code: `labor-${RandomGenerator.alphaNumeric(8)}`,
        name: "Labor",
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussTopic.ICreate,
    },
  );
  typia.assert(labor);

  // 3) Member joins
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberAuth);

  // 4) Member creates a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 5) Member attaches both topics to the post
  const attach1 = await api.functional.econDiscuss.member.posts.topics.create(
    connection,
    {
      postId: post.id,
      body: {
        econ_discuss_topic_id: macro.id,
      } satisfies IEconDiscussPostTopic.ICreate,
    },
  );
  typia.assert(attach1);

  const attach2 = await api.functional.econDiscuss.member.posts.topics.create(
    connection,
    {
      postId: post.id,
      body: {
        econ_discuss_topic_id: labor.id,
      } satisfies IEconDiscussPostTopic.ICreate,
    },
  );
  typia.assert(attach2);

  // 6) Prepare unauthenticated connection clone
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 7) Search attached topics with keyword q="Mac"
  const page = await api.functional.econDiscuss.posts.topics.search(
    publicConn,
    {
      postId: post.id,
      body: {
        q: "Mac",
        page: 1,
        limit: 10,
        sort: "name_asc",
      } satisfies IEconDiscussPostTopic.IRequest,
    },
  );
  typia.assert(page);

  // Assertions
  // Ensure the matching topic (Macro) appears
  const foundMacro = page.data.find((x) => x.id === macro.id);
  TestValidator.predicate(
    "macro topic should be present in keyword-filtered results",
    foundMacro !== undefined,
  );

  // Ensure the non-matching topic (Labor) is excluded
  const foundLabor = page.data.find((x) => x.id === labor.id);
  TestValidator.equals(
    "labor topic should be excluded from keyword-filtered results",
    foundLabor,
    undefined,
  );

  // Ensure all returned items match keyword condition in a case-insensitive manner
  TestValidator.predicate(
    "every returned topic name should include the keyword 'Mac' (case-insensitive)",
    page.data.every((t) => t.name.toLowerCase().includes("mac")),
  );
}
