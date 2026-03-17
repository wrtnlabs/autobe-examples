import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformGuestAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.community_platform_guestsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        anonymous_id: true,
        created_at: true,
        updated_at: true,
        // These relations are not needed for the ISummary DTO but must be included to satisfy system requirements
        sessions: false,
        auditLogs: false,
      },
    } satisfies Prisma.community_platform_guestsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformGuest.ISummary> {
    return {
      id: input.id,
      anonymous_id: input.anonymous_id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
