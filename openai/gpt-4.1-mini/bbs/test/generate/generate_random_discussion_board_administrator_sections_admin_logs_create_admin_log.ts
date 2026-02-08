import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_section_admin_log } from "../prepare/prepare_random_discussion_board_section_admin_log";

export async function generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSectionAdminLog.ICreate> | undefined;
    params: {
      sectionId: string;
    };
  },
): Promise<IDiscussionBoardSectionAdminLog> {
  const prepared: IDiscussionBoardSectionAdminLog.ICreate =
    prepare_random_discussion_board_section_admin_log(props.body);
  const result: IDiscussionBoardSectionAdminLog =
    await api.functional.discussionBoard.administrator.sections.adminLogs.createAdminLog(
      connection,
      {
        sectionId: props.params.sectionId,
        body: prepared,
      },
    );
  return result;
}
