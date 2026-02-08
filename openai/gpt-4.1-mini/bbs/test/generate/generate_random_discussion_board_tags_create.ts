import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_tag } from "../prepare/prepare_random_discussion_board_tag";

export async function generate_random_discussion_board_tags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardTag.ICreate> | undefined;
  },
): Promise<IDiscussionBoardTag> {
  const prepared: IDiscussionBoardTag.ICreate =
    prepare_random_discussion_board_tag(props.body);
  const result: IDiscussionBoardTag =
    await api.functional.discussionBoard.tags.create(connection, {
      body: prepared,
    });
  return result;
}
