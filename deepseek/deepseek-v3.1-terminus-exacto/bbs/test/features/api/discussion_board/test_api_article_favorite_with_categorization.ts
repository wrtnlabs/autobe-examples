import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { generate_random_discussion_board_member_favorites_create } from "../../../generate/generate_random_discussion_board_member_favorites_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_favorite } from "../../../prepare/prepare_random_discussion_board_article_favorite";

/**
 * Test creation of article favorite with optional categorization and personal notes.
 * Validate that category and notes fields are properly stored and returned in the response.
 * Verify that optional fields can be null or contain meaningful user-provided metadata
 * for organizing favorites.
 */
export async function test_api_article_favorite_with_categorization(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
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
  // Create multiple articles to avoid duplicate favorite constraints
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  // Test 1: Create favorite with category and notes
  const favoriteWithMetadata =
    await generate_random_discussion_board_member_favorites_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: article1.id,
          category: "research",
          notes: "Important article for reference",
        } satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(favoriteWithMetadata);
  // Validate favorite with metadata
  TestValidator.equals(
    "article ID matches",
    favoriteWithMetadata.article.id,
    article1.id,
  );
  TestValidator.equals(
    "category is stored",
    favoriteWithMetadata.category,
    "research",
  );
  TestValidator.equals(
    "notes are stored",
    favoriteWithMetadata.notes,
    "Important article for reference",
  );
  TestValidator.predicate(
    "member is set",
    favoriteWithMetadata.member.id === member.id,
  );
  // Test 2: Create favorite with null optional fields
  const favoriteWithNull =
    await generate_random_discussion_board_member_favorites_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: article2.id,
          category: null,
          notes: null,
        } satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(favoriteWithNull);
  // Validate favorite with null values
  TestValidator.equals(
    "article ID matches for null favorite",
    favoriteWithNull.article.id,
    article2.id,
  );
  TestValidator.equals("category is null", favoriteWithNull.category, null);
  TestValidator.equals("notes are null", favoriteWithNull.notes, null);
  TestValidator.predicate(
    "member is set for null favorite",
    favoriteWithNull.member.id === member.id,
  );
  // Test 3: Create favorite with undefined optional fields (not provided)
  const favoriteUndefined =
    await generate_random_discussion_board_member_favorites_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: article3.id,
          // category and notes are intentionally omitted (undefined)
        } satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(favoriteUndefined);
  // Validate favorite with undefined optional fields
  TestValidator.equals(
    "article ID matches for undefined favorite",
    favoriteUndefined.article.id,
    article3.id,
  );
  TestValidator.predicate(
    "member is set for undefined favorite",
    favoriteUndefined.member.id === member.id,
  );
  // Additional validation: Ensure all favorites have proper timestamps
  TestValidator.predicate(
    "favorite with metadata has creation timestamp",
    favoriteWithMetadata.created_at !== undefined,
  );
  TestValidator.predicate(
    "favorite with null has creation timestamp",
    favoriteWithNull.created_at !== undefined,
  );
  TestValidator.predicate(
    "favorite with undefined has creation timestamp",
    favoriteUndefined.created_at !== undefined,
  );
  // Test business logic: Verify that duplicate favorites are prevented
  await TestValidator.error("duplicate favorite should fail", async () => {
    await generate_random_discussion_board_member_favorites_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: article1.id,
          category: "duplicate test",
          notes: "This should fail",
        } satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  });
}
