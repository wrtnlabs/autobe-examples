import { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSystemAuditLogParameterTransformer {
  export type Payload =
    Prisma.discussion_board_system_audit_log_parametersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        parameter_key: true,
        parameter_value: true,
        created_at: true,
        updated_at: true,
        systemAuditLog: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_system_audit_logsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_system_audit_log_parametersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemAuditLogParameter> {
    return {
      id: input.id,
      parameter_key: input.parameter_key,
      parameter_value: input.parameter_value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      system_audit_log_id: input.systemAuditLog.id,
    };
  }
}
