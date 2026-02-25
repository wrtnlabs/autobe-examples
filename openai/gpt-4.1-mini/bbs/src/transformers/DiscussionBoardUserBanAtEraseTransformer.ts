import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardUserBanAtEraseTransformer {
  export type Payload = Prisma.discussion_board_user_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        banned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        registeredUser: {
          select: {
            id: true,
          },
        },
        administrator: {
          select: {
            id: true,
          },
        },
        userUnbans: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_user_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUserBan.IErase> {
    return {
      id: input.id,
      success: true,
    };
  }
}
