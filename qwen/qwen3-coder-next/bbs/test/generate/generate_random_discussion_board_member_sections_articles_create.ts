import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article } from "../prepare/prepare_random_discussion_board_article";

export async function generate_random_discussion_board_member_sections_articles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticle.ICreate> | undefined;
    params: {
      sectionId: string;
    };
  },
): Promise<IDiscussionBoardArticle> {
  const prepared: IDiscussionBoardArticle.ICreate =
    prepare_random_discussion_board_article(props.body);
  return await api.functional.discussionBoard.member.sections.articles.create(
    connection,
    {
      body: prepared,
      sectionId: props.params.sectionId,
    },
  );
}
