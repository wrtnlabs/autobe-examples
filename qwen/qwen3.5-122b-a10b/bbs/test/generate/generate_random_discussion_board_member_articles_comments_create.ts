import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_comment } from "../prepare/prepare_random_discussion_board_comment";

export async function generate_random_discussion_board_member_articles_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardComment.ICreate>;
    params?: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardComment> {
  const prepared: IDiscussionBoardComment.ICreate =
    prepare_random_discussion_board_comment(props.body);
  const result: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: props.params?.articleId ?? typia.random<string & tags.Format<"uuid">>(),
        body: prepared,
      },
    );
  return result;
}