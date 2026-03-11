import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
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
import { generate_random_discussion_board_member_articles_reactions_create } from "../../../generate/generate_random_discussion_board_member_articles_reactions_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_reaction } from "../../../prepare/prepare_random_discussion_board_article_reaction";

export async function test_api_article_reaction_delete_multiple_reaction_types(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
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
  // Create an article
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
  // Define reaction types to test
  const reactionTypes = ["like", "helpful", "insightful"] as const;
  // Add multiple reaction types to the same article
  const reactions = [];
  for (const reactionType of reactionTypes) {
    const reaction =
      await generate_random_discussion_board_member_articles_reactions_create(
        memberConnection,
        {
          body: {
            discussion_board_article_id: article.id,
            reaction_type: reactionType,
          } satisfies IDiscussionBoardArticleReaction.ICreate,
        },
      );
    typia.assert(reaction);
    reactions.push(reaction);
    // Verify reaction was created correctly
    TestValidator.equals(
      "reaction article id",
      reaction.article.id,
      article.id,
    );
    TestValidator.equals("reaction type", reaction.reaction_type, reactionType);
    TestValidator.equals("reaction member id", reaction.member.id, member.id);
  }
  // Test individual deletion of each reaction type
  for (const reaction of reactions) {
    // Delete the reaction
    await api.functional.discussionBoard.member.articles.reactions.erase(
      memberConnection,
      {
        articleId: article.id,
      },
    );
    // Verify that other reactions still exist
    const remainingReactions = reactions.filter(
      (r) => r.reaction_type !== reaction.reaction_type,
    );
    for (const remainingReaction of remainingReactions) {
      // Attempt to create duplicate should fail due to unique constraint
      await TestValidator.error(
        `duplicate ${remainingReaction.reaction_type} reaction should fail`,
        async () => {
          await generate_random_discussion_board_member_articles_reactions_create(
            memberConnection,
            {
              body: {
                discussion_board_article_id: article.id,
                reaction_type: remainingReaction.reaction_type,
              } satisfies IDiscussionBoardArticleReaction.ICreate,
            },
          );
        },
      );
    }
    // Re-add the deleted reaction to continue testing
    const newReaction =
      await generate_random_discussion_board_member_articles_reactions_create(
        memberConnection,
        {
          body: {
            discussion_board_article_id: article.id,
            reaction_type: reaction.reaction_type,
          } satisfies IDiscussionBoardArticleReaction.ICreate,
        },
      );
    typia.assert(newReaction);
    // Update the reactions array with the new reaction
    const index = reactions.findIndex(
      (r) => r.reaction_type === reaction.reaction_type,
    );
    reactions[index] = newReaction;
  }
  // Final verification: all reactions should still exist
  TestValidator.equals(
    "all reactions should exist",
    reactions.length,
    reactionTypes.length,
  );
}
