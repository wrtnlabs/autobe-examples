import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_system_notification } from "../prepare/prepare_random_discussion_board_system_notification";

export async function generate_random_discussion_board_admin_system_notifications_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSystemNotification.ICreate> | undefined;
  },
): Promise<IDiscussionBoardSystemNotification> {
  const prepared: IDiscussionBoardSystemNotification.ICreate =
    prepare_random_discussion_board_system_notification(props.body);
  const result: IDiscussionBoardSystemNotification =
    await api.functional.discussionBoard.admin.system_notifications.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
