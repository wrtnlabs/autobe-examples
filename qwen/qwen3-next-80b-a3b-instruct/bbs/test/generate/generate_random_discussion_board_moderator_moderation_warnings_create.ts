import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";
import { prepare_random_discussion_board_warning } from "../prepare/prepare_random_discussion_board_warning";
export async function generate_random_discussion_board_moderator_moderation_warnings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardWarning.ICreate>;
  },
): Promise<IDiscussionBoardWarning> {
  const prepared: IDiscussionBoardWarning.ICreate =
    prepare_random_discussion_board_warning(props.body);
  const result: IDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
