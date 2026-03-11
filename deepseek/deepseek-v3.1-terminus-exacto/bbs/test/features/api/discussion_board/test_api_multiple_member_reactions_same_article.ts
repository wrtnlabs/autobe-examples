import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
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

export async function test_api_multiple_member_reactions_same_article(
  connection: api.IConnection,
): Promise<void> {
  // Create first member connection
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
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
  typia.assert(member1);
  // Create second member connection
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
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
  typia.assert(member2);
  // Create an article using first member
  const article = await generate_random_discussion_board_member_articles_create(
    member1Connection,
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
  // First member adds reaction
  const articleWithReaction1 =
    await api.functional.discussionBoard.articles.reactions.updateReaction(
      member1Connection,
      {
        articleId: article.id,
        body: {
          reaction_type: "like",
        },
      },
    );
  typia.assert(articleWithReaction1);
  // Second member adds different reaction
  const articleWithReaction2 =
    await api.functional.discussionBoard.articles.reactions.updateReaction(
      member2Connection,
      {
        articleId: article.id,
        body: {
          reaction_type: "helpful",
        },
      },
    );
  typia.assert(articleWithReaction2);
  // Test concurrent reaction updates
  const [concurrentResult1, concurrentResult2] = await Promise.all([
    api.functional.discussionBoard.articles.reactions.updateReaction(
      member1Connection,
      {
        articleId: article.id,
        body: {
          reaction_type: "insightful",
        },
      },
    ),
    api.functional.discussionBoard.articles.reactions.updateReaction(
      member2Connection,
      {
        articleId: article.id,
        body: {
          reaction_type: "insightful",
        },
      },
    ),
  ]);
  typia.assert(concurrentResult1);
  typia.assert(concurrentResult2);
  // Validate article consistency
  TestValidator.equals(
    "article ID remains consistent",
    article.id,
    articleWithReaction1.id,
  );
  TestValidator.equals(
    "article ID remains consistent",
    article.id,
    articleWithReaction2.id,
  );
  TestValidator.equals(
    "article ID remains consistent",
    article.id,
    concurrentResult1.id,
  );
  TestValidator.equals(
    "article ID remains consistent",
    article.id,
    concurrentResult2.id,
  );
  // Validate article structure integrity
  TestValidator.predicate(
    "article maintains title",
    articleWithReaction1.title !== undefined,
  );
  TestValidator.predicate(
    "article maintains body",
    articleWithReaction1.body !== undefined,
  );
  TestValidator.predicate(
    "article maintains author",
    articleWithReaction1.author !== undefined,
  );
  TestValidator.predicate(
    "article maintains section",
    articleWithReaction1.section !== undefined,
  );
}
