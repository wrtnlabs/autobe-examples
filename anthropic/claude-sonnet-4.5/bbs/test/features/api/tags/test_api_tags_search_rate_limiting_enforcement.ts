import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";

export async function test_api_tags_search_rate_limiting_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates tags and category for test data
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create category for topics
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create multiple tags
  const tagNames = [
    "economics",
    "policy",
    "analysis",
    "research",
    "debate",
  ] as const;
  const createdTags = await ArrayUtil.asyncMap(tagNames, async (name) => {
    const tag = await api.functional.discussionBoard.administrator.tags.create(
      connection,
      {
        body: {
          name: name,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardTag.ICreate,
      },
    );
    typia.assert(tag);
    return tag;
  });

  // Step 2: Create member and topics with tags
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Create topics with tags to ensure searchable content
  await ArrayUtil.asyncRepeat(3, async (index) => {
    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          category_id: category.id,
          tag_ids: [createdTags[index % createdTags.length].id],
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
    typia.assert(topic);
  });

  // Step 3: Test guest rate limiting (30 searches per minute)
  const unauthConnection = { ...connection, headers: {} };

  // Perform 30 rapid searches as guest
  await ArrayUtil.asyncRepeat(30, async () => {
    const searchResult = await api.functional.discussionBoard.tags.index(
      unauthConnection,
      {
        body: {
          search: RandomGenerator.pick(tagNames),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardTag.IRequest,
      },
    );
    typia.assert(searchResult);
  });

  // Step 4: Verify 31st search is rate limited
  await TestValidator.error(
    "31st guest search should be rate limited",
    async () => {
      await api.functional.discussionBoard.tags.index(unauthConnection, {
        body: {
          search: "economics",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardTag.IRequest,
      });
    },
  );

  // Step 5: Wait for rate limit window to reset (60 seconds + buffer)
  await new Promise((resolve) => setTimeout(resolve, 61000));

  // Step 6: Verify rate limit has reset for guest
  const resetSearchResult = await api.functional.discussionBoard.tags.index(
    unauthConnection,
    {
      body: {
        search: "economics",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(resetSearchResult);

  // Step 7: Test authenticated member has higher rate limits
  // Re-authenticate as member
  await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardMember.ICreate,
  });

  // Perform more than 30 searches as authenticated user (e.g., 40)
  await ArrayUtil.asyncRepeat(40, async () => {
    const authSearchResult = await api.functional.discussionBoard.tags.index(
      connection,
      {
        body: {
          search: RandomGenerator.pick(tagNames),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardTag.IRequest,
      },
    );
    typia.assert(authSearchResult);
  });

  // Step 8: Verify authenticated users can exceed guest limits
  TestValidator.predicate(
    "authenticated users completed more than 30 searches successfully",
    true,
  );
}
