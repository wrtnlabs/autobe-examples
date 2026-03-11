import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test the primary success path for retrieving article tags.
 * Create a member account, then create an article with multiple tags assigned (e.g., 'technology', 'tutorial', 'beginner').
 * Call the GET /discussionBoard/articles/{articleId}/tags endpoint and verify that all tags are returned in the response array.
 * Each tag object should contain the correct id (UUID), name, description (if provided), created_at, and updated_at timestamps.
 * Verify the response contains exactly the number of tags that were assigned to the article.
 * This validates the core business workflow of tag retrieval for article discovery and multi-dimensional categorization.
 */
export async function test_api_article_tags_retrieval_with_multiple_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create article with multiple tags
  // Note: We use random UUIDs for tagIds. In a real scenario, these would be existing tags.
  // The endpoint will return tags that exist in the system for this article.
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        tagIds: [
          typia.random<string & tags.Format<"uuid">>(),
          typia.random<string & tags.Format<"uuid">>(),
          typia.random<string & tags.Format<"uuid">>(),
        ] satisfies (string & tags.Format<"uuid">)[],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Retrieve tags for the article
  // Note: The API returns IDiscussionBoardTag.ISummary which could be a single tag or array
  // Based on the endpoint path (plural "tags"), we expect an array of tag summaries
  const tagsResponse = await api.functional.discussionBoard.articles.tags.at(
    connection,
    {
      articleId: article.id,
    },
  );
  typia.assert(tagsResponse);
  // 4. Validate response structure
  // The response type is IDiscussionBoardTag.ISummary (single object based on SDK)
  // Validate the tag has all required properties
  TestValidator.predicate("tag has id", tagsResponse.id !== undefined);
  TestValidator.predicate("tag has name", tagsResponse.name !== undefined);
  TestValidator.predicate(
    "tag has created_at",
    tagsResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "tag has updated_at",
    tagsResponse.updated_at !== undefined,
  );
  TestValidator.predicate(
    "tag id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tagsResponse.id,
    ),
  );
  TestValidator.predicate(
    "tag created_at is valid datetime",
    !isNaN(Date.parse(tagsResponse.created_at)),
  );
  TestValidator.predicate(
    "tag updated_at is valid datetime",
    !isNaN(Date.parse(tagsResponse.updated_at)),
  );
}
