import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_member } from "../prepare/prepare_random_discussion_board_member";

export async function generate_random_discussion_board_super_admin_actors_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardMember.ICreate> | undefined;
  },
): Promise<IDiscussionBoardMember> {
  const prepared: IDiscussionBoardMember.ICreate =
    prepare_random_discussion_board_member(props.body);
  const result: IDiscussionBoardMember =
    await api.functional.discussionBoard.superAdmin.actors.create(connection, {
      body: prepared,
    });
  return result;
}
