import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformGuestAtSummaryTransformer } from "./CommunityPlatformGuestAtSummaryTransformer";

export namespace CommunityPlatformGuestSessionAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformGuestSession.ISummary> {
    return {
      id: input.id,
      guest: await CommunityPlatformGuestAtSummaryTransformer.transform(
        input.guest,
      ),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        guest: CommunityPlatformGuestAtSummaryTransformer.select(),
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    } satisfies Prisma.community_platform_guest_sessionsFindManyArgs;
  }
  export type Payload = Prisma.community_platform_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
}
