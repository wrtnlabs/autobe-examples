import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministratorAtDemoteTransformer {
  export type Payload =
    Prisma.discussion_board_admin_hierarchy_actionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason: true,
        created_at: true,
        actor: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_usersFindManyArgs,
        target: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_usersFindManyArgs,
      },
    } satisfies Prisma.discussion_board_admin_hierarchy_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministrator.IDemote> {
    return {
      reason: input.reason ?? undefined,
    };
  }
}
