import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardGuestAtSummaryTransformer } from "./DiscussionBoardGuestAtSummaryTransformer";

export namespace DiscussionBoardGuestSessionTransformer {
  export type Payload = Prisma.discussion_board_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_fingerprint: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        guest: DiscussionBoardGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardGuestSession> {
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      guest: await DiscussionBoardGuestAtSummaryTransformer.transform(
        input.guest,
      ),
    };
  }
}
