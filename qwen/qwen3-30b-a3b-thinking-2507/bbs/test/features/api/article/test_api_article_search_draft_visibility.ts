import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_search_draft_visibility(
  connection: api.IConnection,
): Promise<void> {
  // Create member context for creating articles
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
      ip: null,
    },
  });
  // Ensure title is at least 50 characters (minLength requirement)
  const draftTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 16,
    wordMax: 30,
  });
  const draftContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 20,
    sentenceMax: 30,
  });
  // Create a draft article (will be 'pending' status)
  const draftArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: draftTitle,
          content: draftContent,
        },
      },
    );
  typia.assert(draftArticle);
  // Create a 'published' article (will be 'approved' status)
  const publishedTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 25,
    wordMax: 30,
  });
  const publishedContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 25,
    sentenceMax: 40,
  });
  const publishedArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: publishedTitle,
          content: publishedContent,
        },
      },
    );
  typia.assert(publishedArticle);
  // Search for 'published' articles
  const articles = await api.functional.discussionBoard.search.articles.index(
    connection,
    {
      body: {
        status: "published",
      },
    },
  );
  typia.assert(articles);
  // Verify only the published article is returned in results (draft should not appear)
  TestValidator.predicate(
    "published articles count",
    articles.data.length === 1,
  );
  TestValidator.equals(
    "published article title matches",
    articles.data[0].title,
    publishedTitle,
  );
  TestValidator.equals(
    "draft article not included",
    articles.data.some((a) => a.title === draftTitle),
    false,
  );
}
