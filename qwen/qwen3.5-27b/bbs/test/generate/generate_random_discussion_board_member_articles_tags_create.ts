import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_tag } from "../prepare/prepare_random_discussion_board_article_tag";

export async function generate_random_discussion_board_member_articles_tags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleTag.ICreate>;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardArticleTag> {
  const prepared: IDiscussionBoardArticleTag.ICreate =
    prepare_random_discussion_board_article_tag(props.body);
  const result: IDiscussionBoardArticleTag =
    await api.functional.discussionBoard.member.articles.tags.create(
      connection,
      {
        articleId: props.params.articleId,
        body: prepared,
      },
    );
  return result;
}
