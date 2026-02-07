import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_section } from "../prepare/prepare_random_discussion_board_section";

export async function generate_random_discussion_board_super_admin_sections_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSection.ICreate>;
  },
): Promise<IDiscussionBoardSection> {
  const prepared: IDiscussionBoardSection.ICreate =
    prepare_random_discussion_board_section(props.body);
  const result: IDiscussionBoardSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
