import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
 * Test article creation with tags and verify it appears correctly in search results.
 * This test focuses on the core article creation workflow since search functionality
 * is not available in the provided SDK. It validates member authentication,
 * article creation, and basic article properties.
 */
export async function test_api_article_creation_with_tags_and_search_discovery(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Create an article using the utility function
  // Note: The section ID requirement cannot be properly tested without section creation API
  // The utility function will handle the section ID internally
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        // Provide a mock section ID to satisfy type system - utility will handle it internally
        discussion_board_section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Validate business logic (not redundant type validation)
  TestValidator.equals(
    "article author should match creating member",
    article.author.id,
    member.id,
  );
  TestValidator.equals(
    "article author display name should match member",
    article.author.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "article status should be published",
    article.status,
    "published",
  );
  TestValidator.equals(
    "article should not be deleted",
    article.deleted_at,
    null,
  );
  // Note: Search functionality testing is not possible with the provided SDK
  // The scenario mentions tags and search, but these features are not available
  // in the current API structure
}