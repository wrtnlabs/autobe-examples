import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardModerationActionTypeTransformer {
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
  ): Promise<IDiscussionBoardModerationActionType> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      description: input.description,
      category: input.category ?? undefined,
      severityLevel: input.severity_level ?? undefined,
      requiresReason: input.requires_reason,
      isActive: input.is_active,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
