import { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministrativeHistoryAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_administrative_historiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_type: true,
        target_id: true,
        created_at: true,
        description: true,
        previous_status: true,
        new_status: true,
        updated_at: true,
        administrator: true,
        adminRequest: true,
        userBan: true,
        administratorAssignment: true,
        auditLog: true,
      },
    } satisfies Prisma.discussion_board_administrative_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministrativeHistory.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_type: input.target_type,
      target_id: input.target_id,
      created_at: input.created_at.toISOString(),
    };
  }
}
