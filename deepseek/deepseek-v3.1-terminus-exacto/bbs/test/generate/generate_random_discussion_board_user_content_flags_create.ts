import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_content_flag } from "../prepare/prepare_random_discussion_board_content_flag";

export async function generate_random_discussion_board_user_content_flags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardContentFlag.ICreate>;
  },
): Promise<IDiscussionBoardContentFlag> {
  const prepared: IDiscussionBoardContentFlag.ICreate =
    prepare_random_discussion_board_content_flag(props.body);
  const result: IDiscussionBoardContentFlag =
    await api.functional.discussionBoard.user.content_flags.create(connection, {
      body: prepared,
    });
  return result;
}
