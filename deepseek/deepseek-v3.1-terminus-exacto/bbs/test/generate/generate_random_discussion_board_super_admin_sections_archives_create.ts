import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_section_archive } from "../prepare/prepare_random_discussion_board_section_archive";

export async function generate_random_discussion_board_super_admin_sections_archives_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSectionArchive.ICreate>;
    params: {
      sectionId: string;
    };
  },
): Promise<IDiscussionBoardSectionArchive> {
  const prepared: IDiscussionBoardSectionArchive.ICreate =
    prepare_random_discussion_board_section_archive(props.body);
  const result: IDiscussionBoardSectionArchive =
    await api.functional.discussionBoard.superAdmin.sections.archives.create(
      connection,
      {
        sectionId: props.params.sectionId,
        body: prepared,
      },
    );
  return result;
}
