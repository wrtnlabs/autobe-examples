import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardGuestAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        session_token: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardGuest.ISummary> {
    return {
      id: input.id,
      session_token: input.session_token,
      created_at: input.created_at.toISOString(),
    };
  }
}
