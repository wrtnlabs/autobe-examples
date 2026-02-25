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
        device_fingerprint: true,
        user_agent: true,
        ip_address: true,
        anonymous_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        guestSessions: true,
      },
    } satisfies Prisma.discussion_board_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardGuest.ISummary> {
    return {
      id: input.id,
      deviceFingerprint: input.device_fingerprint,
      userAgent: input.user_agent,
      ipAddress: input.ip_address,
      anonymousId: input.anonymous_id,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
