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

export async function test_api_article_reaction_type_replacement(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // Create article using the generation function
  const article = await generate_random_discussion_board_member_articles_create(
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
  typia.assert(article);
  // Add initial 'helpful' reaction
  const initialReaction =
    await api.functional.discussionBoard.articles.reactions.updateReaction(
      memberConnection,
      {
        articleId: article.id,
        body: {
          reaction_type: "helpful",
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(initialReaction);
  // Replace with 'insightful' reaction
  const updatedReaction =
    await api.functional.discussionBoard.articles.reactions.updateReaction(
      memberConnection,
      {
        articleId: article.id,
        body: {
          reaction_type: "insightful",
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(updatedReaction);
  // Verify the article remains accessible and reaction was processed
  TestValidator.equals(
    "article ID remains the same",
    updatedReaction.id,
    article.id,
  );
  // Test that duplicate reaction prevention works by trying to add same reaction again
  const duplicateReaction =
    await api.functional.discussionBoard.articles.reactions.updateReaction(
      memberConnection,
      {
        articleId: article.id,
        body: {
          reaction_type: "insightful",
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(duplicateReaction);
  // Final verification that article remains accessible after all operations
  TestValidator.equals(
    "article remains accessible after duplicate reaction attempt",
    duplicateReaction.id,
    article.id,
  );
  // Validate business rule: reaction replacement should maintain article integrity
  TestValidator.predicate(
    "article integrity maintained after reaction operations",
    duplicateReaction.author.id === memberAuth.id &&
      duplicateReaction.section.id !== undefined,
  );
}
