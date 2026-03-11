import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_section } from "../prepare/prepare_random_discussion_board_section";

export async function generate_random_discussion_board_super_admin_sections_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSection.ICreate>;
    params: {
      sectionId: string;
    };
  },
): Promise<IDiscussionBoardSectionSnapshot> {
  const prepared: IDiscussionBoardSection.ICreate =
    prepare_random_discussion_board_section(props.body);
  const result: IDiscussionBoardSectionSnapshot =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.create(
      connection,
      {
        sectionId: props.params.sectionId,
        body: prepared,
      },
    );
  return result;
}
