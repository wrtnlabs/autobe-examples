import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardModerationActionTypeAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_moderation_action_typesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        category: true,
        severity_level: true,
        requires_reason: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.discussion_board_moderation_action_typesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModerationActionType.ISummary> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      category: input.category ?? undefined,
      severity_level: input.severity_level ?? undefined,
      requires_reason: input.requires_reason,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
    };
  }
}
