import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_comment } from "../prepare/prepare_random_discussion_board_article_comment";

export async function generate_random_discussion_board_super_admin_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleComment.ICreate> | undefined;
  },
): Promise<IDiscussionBoardArticleComment> {
  const prepared: IDiscussionBoardArticleComment.ICreate =
    prepare_random_discussion_board_article_comment(props.body);
  return await api.functional.discussionBoard.superAdmin.comments.create(
    connection,
    {
      body: prepared,
    },
  );
}
