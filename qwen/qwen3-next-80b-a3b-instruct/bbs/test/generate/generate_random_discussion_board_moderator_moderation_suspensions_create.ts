import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardCitizenSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizenSuspension";
import { prepare_random_discussion_board_citizen_suspension } from "../prepare/prepare_random_discussion_board_citizen_suspension";
export async function generate_random_discussion_board_moderator_moderation_suspensions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCitizenSuspension.ICreate> | undefined;
  },
): Promise<IDiscussionBoardCitizenSuspension> {
  const prepared: IDiscussionBoardCitizenSuspension.ICreate =
    prepare_random_discussion_board_citizen_suspension(props.body);
  return await api.functional.discussionBoard.moderator.moderation.suspensions.create(
    connection,
    {
      body: prepared,
    },
  );
}
