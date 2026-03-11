import api from "@ORGANIZATION/PROJECT-api";
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

import { prepare_random_discussion_board_article_reaction } from "../prepare/prepare_random_discussion_board_article_reaction";

export async function generate_random_discussion_board_member_articles_reactions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleReaction.ICreate> | undefined;
  },
): Promise<IDiscussionBoardArticleReaction> {
  const prepared: IDiscussionBoardArticleReaction.ICreate =
    prepare_random_discussion_board_article_reaction(props.body);
  const result: IDiscussionBoardArticleReaction =
    await api.functional.discussionBoard.member.articles.reactions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
