import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdministrator";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_section_administrator } from "../prepare/prepare_random_discussion_board_section_administrator";

export async function generate_random_discussion_board_super_admin_sections_assignments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSectionAdministrator.ICreate>;
    params: {
      sectionId: string;
    };
  },
): Promise<IDiscussionBoardSectionAdministrator> {
  const prepared: IDiscussionBoardSectionAdministrator.ICreate =
    prepare_random_discussion_board_section_administrator(props.body);
  const result: IDiscussionBoardSectionAdministrator =
    await api.functional.discussionBoard.superAdmin.sections.assignments.create(
      connection,
      {
        sectionId: props.params.sectionId,
        body: prepared,
      },
    );
  return result;
}
