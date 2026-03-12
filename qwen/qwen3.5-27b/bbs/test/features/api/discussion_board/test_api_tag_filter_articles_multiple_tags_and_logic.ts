import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_tags_create } from "../../../generate/generate_random_discussion_board_member_articles_tags_create";
import { generate_random_discussion_board_member_tags_create } from "../../../generate/generate_random_discussion_board_member_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_tag_filter_articles_multiple_tags_and_logic(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that filtering articles by multiple tags uses AND logic.
   * Articles must have ALL specified tags to be included in results.
   */
  // 1. Setup: Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Setup: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Setup: Create section for articles
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section",
          description: "Section for tag filtering test",
        },
      },
    );
  typia.assert(section);
  // 4. Setup: Create three tags
  const tagTechnology =
    await generate_random_discussion_board_member_tags_create(
      memberConnection,
      {
        body: { name: "technology" },
      },
    );
  typia.assert(tagTechnology);
  const tagNews = await generate_random_discussion_board_member_tags_create(
    memberConnection,
    {
      body: { name: "news" },
    },
  );
  typia.assert(tagNews);
  const tagTutorial = await generate_random_discussion_board_member_tags_create(
    memberConnection,
    {
      body: { name: "tutorial" },
    },
  );
  typia.assert(tagTutorial);
  // 5. Create Article A: has 'technology' and 'news' tags
  const articleA =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Article A - Technology and News",
          content: RandomGenerator.paragraph({ sentences: 3 }),
          section_id: section.id,
          tags: ["technology", "news"],
        },
      },
    );
  typia.assert(articleA);
  // 6. Create Article B: has only 'technology' tag
  const articleB =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Article B - Only Technology",
          content: RandomGenerator.paragraph({ sentences: 3 }),
          section_id: section.id,
          tags: ["technology"],
        },
      },
    );
  typia.assert(articleB);
  // 7. Create Article C: has only 'news' tag
  const articleC =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Article C - Only News",
          content: RandomGenerator.paragraph({ sentences: 3 }),
          section_id: section.id,
          tags: ["news"],
        },
      },
    );
  typia.assert(articleC);
  // 8. Create Article D: has 'technology', 'news', and 'tutorial' tags
  const articleD =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Article D - All Three Tags",
          content: RandomGenerator.paragraph({ sentences: 3 }),
          section_id: section.id,
          tags: ["technology", "news", "tutorial"],
        },
      },
    );
  typia.assert(articleD);
  // 9. Test: Filter by 'technology' AND 'news' tags (should return Article A and Article D only)
  const filterResultTwoTags =
    await api.functional.discussionBoard.tags.articles.patch(memberConnection, {
      body: {
        tag_ids: [tagTechnology.id, tagNews.id],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(filterResultTwoTags);
  // 10. Validate: Check that only articles with BOTH tags are returned
  TestValidator.equals(
    "two tag filter returns correct count",
    filterResultTwoTags.pagination.records,
    2,
  );
  const returnedArticleIdsTwoTags = filterResultTwoTags.data.map((a) => a.id);
  TestValidator.predicate(
    "article A included in two tag filter",
    returnedArticleIdsTwoTags.includes(articleA.id),
  );
  TestValidator.predicate(
    "article D included in two tag filter",
    returnedArticleIdsTwoTags.includes(articleD.id),
  );
  TestValidator.predicate(
    "article B excluded from two tag filter",
    !returnedArticleIdsTwoTags.includes(articleB.id),
  );
  TestValidator.predicate(
    "article C excluded from two tag filter",
    !returnedArticleIdsTwoTags.includes(articleC.id),
  );
  // 11. Test: Filter by all three tags (should return only Article D)
  const filterResultThreeTags =
    await api.functional.discussionBoard.tags.articles.patch(memberConnection, {
      body: {
        tag_ids: [tagTechnology.id, tagNews.id, tagTutorial.id],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(filterResultThreeTags);
  // 12. Validate: Check that only article with ALL three tags is returned
  TestValidator.equals(
    "three tag filter returns correct count",
    filterResultThreeTags.pagination.records,
    1,
  );
  const returnedArticleIdsThreeTags = filterResultThreeTags.data.map(
    (a) => a.id,
  );
  TestValidator.predicate(
    "article D included in three tag filter",
    returnedArticleIdsThreeTags.includes(articleD.id),
  );
  TestValidator.predicate(
    "article A excluded from three tag filter",
    !returnedArticleIdsThreeTags.includes(articleA.id),
  );
  TestValidator.predicate(
    "article B excluded from three tag filter",
    !returnedArticleIdsThreeTags.includes(articleB.id),
  );
  TestValidator.predicate(
    "article C excluded from three tag filter",
    !returnedArticleIdsThreeTags.includes(articleC.id),
  );
}
