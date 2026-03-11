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
 * Test successful creation of an article favorite with optional categorization and notes.
 * Validate that an authenticated member can bookmark an article they have permission to view.
 * Verify the response includes complete favorite record with member and article references,
 * timestamps, and optional fields. Ensure the system prevents duplicate favorites through
 * unique constraint validation.
 */
export async function test_api_article_favorite_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
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
    },
  });
  typia.assert(member);
  // 2. Create an article - note: section ID should be valid but we'll use random for test
  // In a real scenario, we would need to create a section first or use an existing one
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // 3. Create favorite with optional category and notes
  const favoriteBody = {
    discussion_board_article_id: article.id,
    category: RandomGenerator.pick([
      "to-read",
      "research",
      "personal",
    ] as const),
    notes: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IDiscussionBoardArticleFavorite.ICreate;
  const favorite =
    await generate_random_discussion_board_member_favorites_create(
      memberConnection,
      { body: favoriteBody },
    );
  typia.assert(favorite);
  // 4. Validate business logic (not type validation - typia.assert already handled that)
  TestValidator.equals(
    "member reference matches",
    favorite.member.id,
    member.id,
  );
  TestValidator.equals(
    "member display name matches",
    favorite.member.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "article reference matches",
    favorite.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    favorite.article.title,
    article.title,
  );
  TestValidator.equals(
    "category matches input",
    favorite.category,
    favoriteBody.category,
  );
  TestValidator.equals(
    "notes matches input",
    favorite.notes,
    favoriteBody.notes,
  );
  TestValidator.equals(
    "deleted_at is null for active favorite",
    favorite.deleted_at,
    null,
  );
  // 5. Test duplicate favorite prevention
  await TestValidator.error("duplicate favorite creation fails", async () => {
    await generate_random_discussion_board_member_favorites_create(
      memberConnection,
      { body: favoriteBody },
    );
  });
}
