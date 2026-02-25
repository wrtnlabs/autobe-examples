import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_comment } from "../prepare/prepare_random_discussion_board_comment";

export async function generate_random_discussion_board_registered_user_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardComment.ICreate> | undefined;
  },
): Promise<IDiscussionBoardComment> {
  const prepared: IDiscussionBoardComment.ICreate =
    prepare_random_discussion_board_comment(props.body);
  const result: IDiscussionBoardComment =
    await api.functional.discussionBoard.registeredUser.comments.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
