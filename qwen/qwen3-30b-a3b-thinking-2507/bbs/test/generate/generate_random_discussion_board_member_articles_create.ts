import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { prepare_random_discussion_board_article } from "../prepare/prepare_random_discussion_board_article";
export async function generate_random_discussion_board_member_articles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticle.ICreate>;
  },
): Promise<IDiscussionBoardArticle> {
  const prepared: IDiscussionBoardArticle.ICreate =
    prepare_random_discussion_board_article(props.body);
  return await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: prepared,
    },
  );
}
