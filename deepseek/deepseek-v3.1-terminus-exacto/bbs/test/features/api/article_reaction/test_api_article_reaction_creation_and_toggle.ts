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

/**
 * Test the complete reaction lifecycle where a member first creates a reaction on an article,
 * then toggles the same reaction type off.
 */
export async function test_api_article_reaction_creation_and_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
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
  // Update member connection with authorization token
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 2. Create an article for reaction testing using the utility function
  // The utility function should handle section creation internally
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // 3. Add 'like' reaction to the article
  const reactionRequest = {
    reaction_type: "like",
  } satisfies IDiscussionBoardArticleReaction.IRequest;
  const articleWithReaction =
    await api.functional.discussionBoard.articles.reactions.updateReaction(
      memberConnection,
      {
        articleId: article.id,
        body: reactionRequest,
      },
    );
  typia.assert(articleWithReaction);
  // Verify article details are preserved
  TestValidator.equals(
    "article ID matches",
    articleWithReaction.id,
    article.id,
  );
  TestValidator.equals(
    "title matches",
    articleWithReaction.title,
    article.title,
  );
  TestValidator.equals("body matches", articleWithReaction.body, article.body);
  TestValidator.equals(
    "author matches",
    articleWithReaction.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "section matches",
    articleWithReaction.section.id,
    article.section.id,
  );
  // 4. Toggle the same reaction type off
  const articleWithoutReaction =
    await api.functional.discussionBoard.articles.reactions.updateReaction(
      memberConnection,
      {
        articleId: article.id,
        body: reactionRequest,
      },
    );
  typia.assert(articleWithoutReaction);
  // Verify article details are still preserved after toggle
  TestValidator.equals(
    "article ID preserved",
    articleWithoutReaction.id,
    article.id,
  );
  TestValidator.equals(
    "title preserved",
    articleWithoutReaction.title,
    article.title,
  );
  TestValidator.equals(
    "body preserved",
    articleWithoutReaction.body,
    article.body,
  );
  TestValidator.equals(
    "author preserved",
    articleWithoutReaction.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "section preserved",
    articleWithoutReaction.section.id,
    article.section.id,
  );
  // 5. Test business rule: Try to add reaction again - should toggle back on
  const articleWithReactionAgain =
    await api.functional.discussionBoard.articles.reactions.updateReaction(
      memberConnection,
      {
        articleId: article.id,
        body: reactionRequest,
      },
    );
  typia.assert(articleWithReactionAgain);
  // Final verification that article structure remains consistent
  TestValidator.equals(
    "final article ID",
    articleWithReactionAgain.id,
    article.id,
  );
  TestValidator.equals(
    "final title",
    articleWithReactionAgain.title,
    article.title,
  );
  TestValidator.equals(
    "final body",
    articleWithReactionAgain.body,
    article.body,
  );
  // 6. Test business rule: Each member can have only one active reaction type per article
  // Try to add a different reaction type - should replace the existing 'like' reaction
  const differentReactionRequest = {
    reaction_type: "helpful",
  } satisfies IDiscussionBoardArticleReaction.IRequest;
  const articleWithDifferentReaction =
    await api.functional.discussionBoard.articles.reactions.updateReaction(
      memberConnection,
      {
        articleId: article.id,
        body: differentReactionRequest,
      },
    );
  typia.assert(articleWithDifferentReaction);
  // Verify the article structure remains intact with the new reaction
  TestValidator.equals(
    "different reaction article ID",
    articleWithDifferentReaction.id,
    article.id,
  );
  TestValidator.equals(
    "different reaction title",
    articleWithDifferentReaction.title,
    article.title,
  );
  TestValidator.equals(
    "different reaction body",
    articleWithDifferentReaction.body,
    article.body,
  );
}
