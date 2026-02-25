import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_audit_log } from "../prepare/prepare_random_discussion_board_audit_log";

export async function generate_random_discussion_board_super_administrator_audit_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAuditLog.ICreate>;
  },
): Promise<IDiscussionBoardAuditLog> {
  const prepared: IDiscussionBoardAuditLog.ICreate =
    prepare_random_discussion_board_audit_log(props.body);
  const result: IDiscussionBoardAuditLog =
    await api.functional.discussionBoard.superAdministrator.auditLogs.create(
      connection,
      { body: prepared },
    );
  return result;
}
