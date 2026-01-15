import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { prepare_random_discussion_board_report } from "../prepare/prepare_random_discussion_board_report";
export async function generate_random_discussion_board_citizen_moderation_report_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardReport.ICreate> | undefined;
  },
): Promise<IDiscussionBoardReport> {
  const prepared: IDiscussionBoardReport.ICreate =
    prepare_random_discussion_board_report(props.body);
  return await api.functional.discussionBoard.citizen.moderation.report.create(
    connection,
    {
      body: prepared,
    },
  );
}
