import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_system_audit_log_parameter } from "../prepare/prepare_random_discussion_board_system_audit_log_parameter";

export async function generate_random_discussion_board_admin_system_audit_logs_parameters_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSystemAuditLogParameter.ICreate>;
    params: {
      auditLogId: string;
    };
  },
): Promise<IDiscussionBoardSystemAuditLogParameter> {
  const prepared: IDiscussionBoardSystemAuditLogParameter.ICreate =
    prepare_random_discussion_board_system_audit_log_parameter(props.body);
  const result: IDiscussionBoardSystemAuditLogParameter =
    await api.functional.discussionBoard.admin.system_audit_logs.parameters.create(
      connection,
      {
        auditLogId: props.params.auditLogId,
        body: prepared,
      },
    );
  return result;
}
