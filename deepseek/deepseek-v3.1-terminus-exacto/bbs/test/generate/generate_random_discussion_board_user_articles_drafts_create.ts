import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_draft } from "../prepare/prepare_random_discussion_board_article_draft";

export async function generate_random_discussion_board_user_articles_drafts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleDraft.ICreate>;
  },
): Promise<IDiscussionBoardArticleDraft> {
  const prepared: IDiscussionBoardArticleDraft.ICreate =
    prepare_random_discussion_board_article_draft(props.body);
  const result: IDiscussionBoardArticleDraft =
    await api.functional.discussionBoard.user.articles_drafts.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
