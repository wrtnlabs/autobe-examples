import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_maintenance_schedule } from "../prepare/prepare_random_discussion_board_maintenance_schedule";

export async function generate_random_discussion_board_super_admin_maintenance_schedules_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardMaintenanceSchedule.ICreate>;
  },
): Promise<IDiscussionBoardMaintenanceSchedule> {
  const prepared: IDiscussionBoardMaintenanceSchedule.ICreate =
    prepare_random_discussion_board_maintenance_schedule(props.body);
  const result: IDiscussionBoardMaintenanceSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
