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

export async function test_api_article_reaction_duplicate_prevention(
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
  // 2. Create an article for reactions
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
  // 3. Create initial reaction successfully
  const reactionType = "like";
  const initialReaction =
    await api.functional.discussionBoard.member.articles.reactions.create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: article.id,
          reaction_type: reactionType,
        } satisfies IDiscussionBoardArticleReaction.ICreate,
      },
    );
  typia.assert(initialReaction);
  // 4. Attempt to create duplicate reaction - should fail
  await TestValidator.error("duplicate reaction prevention", async () => {
    await api.functional.discussionBoard.member.articles.reactions.create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: article.id,
          reaction_type: reactionType,
        } satisfies IDiscussionBoardArticleReaction.ICreate,
      },
    );
  });
  // 5. Validate that different reaction types are allowed
  const differentReactionType = "helpful";
  const differentReaction =
    await api.functional.discussionBoard.member.articles.reactions.create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: article.id,
          reaction_type: differentReactionType,
        } satisfies IDiscussionBoardArticleReaction.ICreate,
      },
    );
  typia.assert(differentReaction);
  // 6. Validate reaction properties
  TestValidator.equals(
    "reaction type matches",
    initialReaction.reaction_type,
    reactionType,
  );
  TestValidator.equals(
    "article ID matches",
    initialReaction.article.id,
    article.id,
  );
  TestValidator.equals(
    "member ID matches",
    initialReaction.member.id,
    member.id,
  );
  TestValidator.equals(
    "different reaction type",
    differentReaction.reaction_type,
    differentReactionType,
  );
  TestValidator.notEquals(
    "reaction IDs differ",
    initialReaction.id,
    differentReaction.id,
  );
}
