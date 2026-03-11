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
 * Test prevention of duplicate favorites when a member attempts to favorite the same article twice.
 * Verify the system returns an appropriate error indicating the favorite already exists.
 * Validate that the unique constraint (member + article combination) is properly enforced
 * and prevents duplicate records.
 */
export async function test_api_article_favorite_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
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
  // 2. Create an article for the member to favorite
  // Note: The article creation requires a valid section ID, but since we don't have
  // section creation utility, we'll use the generation function which should handle
  // the section ID requirement internally
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create first favorite (should succeed)
  const favoriteBody = {
    discussion_board_article_id: article.id,
    category: RandomGenerator.name(),
    notes: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IDiscussionBoardArticleFavorite.ICreate;
  const firstFavorite =
    await generate_random_discussion_board_member_favorites_create(
      memberConnection,
      { body: favoriteBody },
    );
  typia.assert(firstFavorite);
  // 4. Validate first favorite was created correctly
  TestValidator.equals(
    "favorite article ID matches",
    firstFavorite.article.id,
    article.id,
  );
  TestValidator.equals(
    "favorite member ID matches",
    firstFavorite.member.id,
    member.id,
  );
  // 5. Attempt to create duplicate favorite (should fail)
  await TestValidator.error("duplicate favorite should fail", async () => {
    await generate_random_discussion_board_member_favorites_create(
      memberConnection,
      { body: favoriteBody },
    );
  });
}
