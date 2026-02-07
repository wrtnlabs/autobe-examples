import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_section_file } from "../prepare/prepare_random_discussion_board_section_file";

export async function generate_random_discussion_board_admin_sections_files_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSectionFile.ICreate>;
    params: {
      sectionId: string;
    };
  },
): Promise<IDiscussionBoardSectionFile> {
  const prepared: IDiscussionBoardSectionFile.ICreate =
    prepare_random_discussion_board_section_file(props.body);
  const result: IDiscussionBoardSectionFile =
    await api.functional.discussionBoard.admin.sections.files.create(
      connection,
      {
        sectionId: props.params.sectionId,
        body: prepared,
      },
    );
  return result;
}
